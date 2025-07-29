// 🔧 加载环境变量
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFileToTos } = require('./config/tos-config');
const { initDatabase } = require('./config/database');
const { startAsrPolling } = require('./lib/asr-polling');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 中间件设置
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// 📁 上传目录
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 📝 Multer配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// 🗄️ 数据库初始化
let db;
initDatabase((database) => {
  db = database;
  console.log('✅ 数据库初始化完成');
});

// 🔧 检查TOS环境变量
console.log('🔧 检查TOS环境变量:');
console.log('  VOLC_ACCESSKEY:', process.env.VOLC_ACCESSKEY ? '已设置' : '未设置');
console.log('  VOLC_SECRETKEY:', process.env.VOLC_SECRETKEY ? '已设置' : '未设置');
if (process.env.VOLC_ACCESSKEY && process.env.VOLC_SECRETKEY) {
  console.log('✅ TOS客户端初始化完成');
} else {
  console.warn('⚠️ TOS环境变量未完全设置，上传功能可能受限');
}

// 🏠 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 📤 录音上传接口
app.post('/upload', upload.single('recording'), async (req, res) => {
  try {
    console.log('\n🎙️ 收到录音上传请求');
    
    if (!req.file) {
      return res.status(400).json({ error: '没有接收到文件' });
    }

    const { filename, originalname, path: filePath, size } = req.file;
    console.log(`📁 文件信息: ${originalname} (${filename}) - ${(size / 1024).toFixed(2)}KB`);

    // 📝 保存到数据库
    const recordingIdValue = filename.replace('.webm', ''); // 从文件名提取recording_id
    const insertQuery = `
      INSERT INTO recordings (filename, original_name, recording_id, status, created_at) 
      VALUES (?, ?, ?, ?, datetime('now'))
    `;
    
    // 使用Promise包装异步数据库操作
    const recordingId = await new Promise((resolve, reject) => {
      db.run(insertQuery, [filename, originalname, recordingIdValue, 'uploaded'], function(err) {
        if (err) {
          console.error('❌ 数据库插入失败:', err);
          reject(new Error(`数据库插入失败：${err.message}`));
        } else {
          const insertedId = this.lastID;
          console.log(`✅ 录音记录已保存到数据库，ID: ${insertedId}`);
          
          // 验证recordingId
          if (!insertedId) {
            console.error('数据库插入结果: lastID为空');
            reject(new Error('数据库插入失败：无法获取记录ID'));
          } else {
            resolve(insertedId);
          }
        }
      });
    });

    // 🌊 上传到TOS
    try {
      const uploadResult = await uploadFileToTos(filePath, filename, recordingId);
      
      if (uploadResult.success) {
        console.log(`✅ 文件已上传到TOS: ${uploadResult.objectKey}`);
        
        // 更新数据库记录
        db.run(
          `UPDATE recordings SET tos_object_key = ?, tos_file_url = ?, tos_upload_status = ? WHERE id = ?`,
          [uploadResult.objectKey, uploadResult.fileUrl, 'completed', recordingId],
          function(err) {
            if (err) {
              console.error('❌ 更新数据库记录失败:', err);
            } else {
              console.log(`✅ 数据库记录已更新 (影响行数: ${this.changes})`);
            }
          }
        );

        // 📱 返回成功响应
        res.json({
          success: true,
          id: recordingId,
          recordingId: recordingId,
          filename: filename,
          originalname: originalname,
          tosKey: uploadResult.objectKey,
          message: '文件上传成功，TOS事件将触发ASR处理'
        });
      } else {
        throw new Error(uploadResult.error || 'TOS上传失败');
      }

    } catch (tosError) {
      console.error('❌ TOS上传失败:', tosError);
      
      // 更新数据库状态为失败
      db.run(
        `UPDATE recordings SET tos_upload_status = ? WHERE id = ?`,
        ['failed', recordingId],
        function(err) {
          if (err) {
            console.error('❌ 更新失败状态失败:', err);
          } else {
            console.log(`✅ 已更新录音 ${recordingId} 状态为失败`);
          }
        }
      );
      
      res.status(500).json({ 
        error: 'TOS上传失败', 
        details: tosError.message 
      });
    }

  } catch (error) {
    console.error('❌ 上传处理错误:', error);
    res.status(500).json({ 
      error: '服务器错误', 
      details: error.message 
    });
  }
});

// 🚀 启动ASR轮询接口 (新架构核心)
app.post('/api/start-polling', (req, res) => {
  try {
    console.log('\n🔄 收到启动轮询请求');
    console.log('📥 请求体:', JSON.stringify(req.body, null, 2));
    
    const { recordingId, requestId, source } = req.body;
    
    if (!recordingId || !requestId) {
      return res.status(400).json({ 
        error: '缺少必要参数', 
        required: ['recordingId', 'requestId'] 
      });
    }
    
    console.log(`🎯 开始为录音 ${recordingId} 启动轮询 (requestId: ${requestId})`);
    
    // 更新数据库状态
    db.run(
      `UPDATE recordings SET request_id = ?, status = ? WHERE id = ?`,
      [requestId, 'polling', recordingId],
      function(err) {
        if (err) {
          console.error('❌ 更新数据库状态失败:', err);
          return res.status(500).json({ error: '数据库更新失败' });
        }
        
        console.log(`✅ 录音 ${recordingId} 状态已更新为polling (影响行数: ${this.changes})`);
        
        // 🔄 启动轮询服务
        startAsrPolling(recordingId, requestId, db);
        
        res.json({
          success: true,
          message: '轮询服务已启动',
          recordingId: recordingId,
          requestId: requestId,
          status: 'polling'
        });
      }
    );
    
  } catch (error) {
    console.error('❌ 启动轮询错误:', error);
    res.status(500).json({ 
      error: '启动轮询失败', 
      details: error.message 
    });
  }
});

// 📋 获取录音列表
app.get('/api/recordings', (req, res) => {
  try {
    db.all(`
      SELECT 
        id, 
        filename, 
        original_name, 
        transcription, 
        status, 
        request_id,
        created_at 
      FROM recordings 
      ORDER BY created_at DESC 
      LIMIT 50
    `, (err, rows) => {
      if (err) {
        console.error('❌ 查询录音列表失败:', err);
        return res.status(500).json({ error: '查询失败' });
      }
      
      // 解析转录数据
      const recordings = rows.map(row => {
        let transcriptionData = null;
        if (row.transcription) {
          try {
            transcriptionData = JSON.parse(row.transcription);
          } catch (e) {
            transcriptionData = { text: row.transcription };
          }
        }
        
        return {
          ...row,
          transcriptionData
        };
      });
      
      res.json(recordings);
    });
  } catch (error) {
    console.error('❌ 获取录音列表错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 🔍 获取单个录音详情
app.get('/api/recordings/:id', (req, res) => {
  const recordingId = req.params.id;
  
  db.get(`
    SELECT * FROM recordings WHERE id = ?
  `, [recordingId], (err, row) => {
    if (err) {
      console.error('❌ 查询录音失败:', err);
      return res.status(500).json({ error: '查询失败' });
    }
    
    if (!row) {
      return res.status(404).json({ error: '录音不存在' });
    }
    
    // 解析转录数据
    let transcriptionData = null;
    if (row.transcription) {
      try {
        transcriptionData = JSON.parse(row.transcription);
      } catch (e) {
        transcriptionData = { text: row.transcription };
      }
    }
    
    res.json({
      ...row,
      transcriptionData
    });
  });
});

// 🗑️ 删除录音
app.delete('/api/recordings/:id', (req, res) => {
  const recordingId = req.params.id;
  
  // 先查询文件信息
  db.get('SELECT filename FROM recordings WHERE id = ?', [recordingId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '查询失败' });
    }
    
    if (!row) {
      return res.status(404).json({ error: '录音不存在' });
    }
    
    // 删除数据库记录
    db.run('DELETE FROM recordings WHERE id = ?', [recordingId], function(deleteErr) {
      if (deleteErr) {
        return res.status(500).json({ error: '删除失败' });
      }
      
      // 删除本地文件
      const filePath = path.join(uploadDir, row.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ 已删除本地文件: ${row.filename}`);
        } catch (fileErr) {
          console.error('❌ 删除本地文件失败:', fileErr);
        }
      }
      
      res.json({ 
        success: true, 
        message: '录音已删除',
        deletedRows: this.changes 
      });
    });
  });
});

// 🩺 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 🚀 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 服务器启动成功!`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`🎙️ 上传接口: http://localhost:${PORT}/upload`);
  console.log(`🔄 轮询接口: http://localhost:${PORT}/api/start-polling`);
  console.log(`📋 录音列表: http://localhost:${PORT}/api/recordings`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}\n`);
});

// 🛑 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 收到停止信号，正在关闭服务器...');
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('❌ 关闭数据库连接失败:', err);
      } else {
        console.log('✅ 数据库连接已关闭');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

module.exports = app;
