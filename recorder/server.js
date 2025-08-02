// 🔧 加载环境变量
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { uploadFileToTos } = require('./config/tos-config');
const { initDatabase } = require('./config/database');
const { processAudioWithChunking } = require('./lib/integrated-asr');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 CORS配置 - 支持ngrok和本地访问
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的来源
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      /^https:\/\/.*\.ngrok-free\.app$/,  // 允许所有ngrok域名
      /^https:\/\/.*\.ngrok\.io$/,        // 允许旧版ngrok域名
    ];
    
    // 如果没有origin（比如移动应用或Postman），也允许
    if (!origin) return callback(null, true);
    
    // 检查origin是否在允许列表中
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      console.log(`✅ CORS允许访问: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS拒绝访问: ${origin}`);
      callback(new Error('CORS策略不允许此来源访问'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
};

// 🔧 中间件设置
app.use(cors(corsOptions));
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
  },
  fileFilter: (req, file, cb) => {
    console.log(`📋 文件过滤检查:`);
    console.log(`  - 字段名: ${file.fieldname}`);
    console.log(`  - 原始文件名: ${file.originalname}`);
    console.log(`  - MIME类型: ${file.mimetype}`);
    
    // 允许的文件类型
    const allowedMimes = [
      'audio/webm',
      'audio/wav', 
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/ogg'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      console.log(`✅ 文件类型验证通过: ${file.mimetype}`);
      cb(null, true);
    } else {
      console.error(`❌ 不支持的文件类型: ${file.mimetype}`);
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  }
});

// Multer错误处理中间件
function handleMulterError(err, req, res, next) {
  console.error('❌ Multer错误:', err);
  
  if (err instanceof multer.MulterError) {
    console.error('  - Multer错误类型:', err.code);
    console.error('  - 错误消息:', err.message);
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({ 
          error: '文件过大', 
          details: `文件大小超过100MB限制`,
          maxSize: '100MB'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ 
          error: '文件数量超限', 
          details: '一次只能上传一个文件' 
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          error: '意外的文件字段', 
          details: '请使用正确的文件字段名' 
        });
      default:
        return res.status(400).json({ 
          error: '文件上传错误', 
          details: err.message 
        });
    }
  } else if (err.message.includes('不支持的文件类型')) {
    return res.status(400).json({ 
      error: '文件类型不支持', 
      details: err.message,
      supportedTypes: ['webm', 'wav', 'mp3', 'mp4', 'm4a', 'ogg']
    });
  }
  
  next(err);
}

// 🗄️ 数据库初始化
let db;

// 数据库检查中间件
function checkDatabase(req, res, next) {
  if (!db) {
    console.error('❌ 数据库未初始化');
    return res.status(500).json({ error: '数据库未就绪，请稍后重试' });
  }
  next();
}

initDatabase((database) => {
  db = database;
  console.log('✅ 数据库初始化完成');
});

// 🔧 检查环境配置
console.log('\n🔧 环境配置检查:');
console.log('📋 基本配置:');
console.log('  - NODE_ENV:', process.env.NODE_ENV || '未设置');
console.log('  - PORT:', process.env.PORT || '3000 (默认)');
console.log('  - 工作目录:', __dirname);
console.log('  - uploads目录:', uploadDir);

console.log('\n🌊 TOS配置:');
console.log('  - VOLC_ACCESSKEY:', process.env.VOLC_ACCESSKEY ? `已设置 (长度: ${process.env.VOLC_ACCESSKEY.length})` : '❌ 未设置');
console.log('  - VOLC_SECRETKEY:', process.env.VOLC_SECRETKEY ? `已设置 (长度: ${process.env.VOLC_SECRETKEY.length})` : '❌ 未设置');
console.log('  - TOS_BUCKET:', process.env.TOS_BUCKET ? `已设置 (${process.env.TOS_BUCKET})` : '❌ 未设置');

console.log('\n📁 目录检查:');
console.log('  - uploads目录存在:', fs.existsSync(uploadDir) ? '✅' : '❌');
console.log('  - .env文件存在:', fs.existsSync(path.join(__dirname, '.env')) ? '✅' : '❌');

if (process.env.VOLC_ACCESSKEY && process.env.VOLC_SECRETKEY && process.env.TOS_BUCKET) {
  console.log('\n✅ TOS配置完整，上传功能可用');
} else {
  console.warn('\n⚠️ TOS配置不完整，上传功能可能受限');
  console.warn('💡 请确保设置以下环境变量:');
  if (!process.env.VOLC_ACCESSKEY) console.warn('   - VOLC_ACCESSKEY');
  if (!process.env.VOLC_SECRETKEY) console.warn('   - VOLC_SECRETKEY');
  if (!process.env.TOS_BUCKET) console.warn('   - TOS_BUCKET');
  console.warn('📝 参考 .env.example 文件进行配置');
}

// 🏠 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 📤 录音上传接口
app.post('/upload', checkDatabase, upload.single('recording'), handleMulterError, async (req, res) => {
  try {
    console.log('\n🎙️ 收到录音上传请求');
    console.log('📊 请求详情:');
    console.log('  - Content-Length:', req.get('Content-Length'));
    console.log('  - Content-Type:', req.get('Content-Type'));
    
    if (!req.file) {
      console.error('❌ 没有接收到文件');
      console.log('📋 请求体信息:', {
        hasFile: !!req.file,
        bodyKeys: Object.keys(req.body),
        filesKeys: req.files ? Object.keys(req.files) : 'no files'
      });
      return res.status(400).json({ error: '没有接收到文件' });
    }

    const { filename, originalname, path: filePath, size } = req.file;
    console.log(`📁 文件信息详情:`);
    console.log(`  - 原始文件名: ${originalname}`);
    console.log(`  - 保存文件名: ${filename}`);
    console.log(`  - 文件路径: ${filePath}`);
    console.log(`  - 文件大小: ${(size / 1024).toFixed(2)}KB (${size} bytes)`);
    console.log(`  - 文件大小限制: ${100 * 1024 * 1024} bytes (100MB)`);
    
    // 检查文件大小
    if (size > 100 * 1024 * 1024) {
      console.error(`❌ 文件过大: ${(size / 1024 / 1024).toFixed(2)}MB > 100MB`);
      return res.status(413).json({ error: '文件过大，最大支持100MB' });
    }
    
    // 检查文件是否真实存在
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 上传的文件不存在: ${filePath}`);
      return res.status(500).json({ error: '文件上传失败，文件不存在' });
    }
    
    console.log(`✅ 文件验证通过`);
    
    // 检查uploads目录
    console.log(`📂 检查uploads目录: ${uploadDir}`);
    if (!fs.existsSync(uploadDir)) {
      console.log(`📁 创建uploads目录: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 📝 保存到数据库
    const recordingIdValue = filename.replace('.webm', ''); // 从文件名提取recording_id
    console.log(`💾 准备保存到数据库:`);
    console.log(`  - recording_id: ${recordingIdValue}`);
    console.log(`  - filename: ${filename}`);
    console.log(`  - original_name: ${originalname}`);
    
    const insertQuery = `
      INSERT INTO recordings (filename, original_name, recording_id, status, created_at) 
      VALUES (?, ?, ?, ?, datetime('now'))
    `;
    
    // 使用Promise包装异步数据库操作
    const recordingId = await new Promise((resolve, reject) => {
      console.log(`🔄 执行数据库插入操作...`);
      db.run(insertQuery, [filename, originalname, recordingIdValue, 'uploaded'], function(err) {
        if (err) {
          console.error('❌ 数据库插入失败:', err);
          console.error('  - 错误类型:', err.name);
          console.error('  - 错误代码:', err.code);
          console.error('  - 错误消息:', err.message);
          console.error('  - SQL语句:', insertQuery);
          console.error('  - 参数:', [filename, originalname, recordingIdValue, 'uploaded']);
          reject(new Error(`数据库插入失败：${err.message}`));
        } else {
          const insertedId = this.lastID;
          console.log(`✅ 数据库插入成功:`);
          console.log(`  - 插入ID: ${insertedId}`);
          console.log(`  - 影响行数: ${this.changes}`);
          
          // 验证recordingId
          if (!insertedId) {
            console.error('❌ 数据库插入结果异常: lastID为空');
            reject(new Error('数据库插入失败：无法获取记录ID'));
          } else {
            resolve(insertedId);
          }
        }
      });
    });

    // 🌊 上传到TOS
    console.log(`🚀 开始TOS上传流程:`);
    console.log(`  - 文件路径: ${filePath}`);
    console.log(`  - 文件名: ${filename}`);
    console.log(`  - 录音ID: ${recordingId}`);
    
    try {
      const uploadResult = await uploadFileToTos(filePath, filename, recordingId);
      console.log(`📤 TOS上传结果:`, uploadResult);
      
      if (uploadResult.success) {
        console.log(`✅ TOS上传成功:`);
        console.log(`  - 对象键: ${uploadResult.objectKey}`);
        console.log(`  - 文件URL: ${uploadResult.fileUrl}`);
        console.log(`  - ETag: ${uploadResult.etag}`);
        
        // 更新数据库记录
        console.log(`🔄 更新数据库TOS信息...`);
        db.run(
          `UPDATE recordings SET tos_object_key = ?, tos_file_url = ?, tos_upload_status = ? WHERE id = ?`,
          [uploadResult.objectKey, uploadResult.fileUrl, 'completed', recordingId],
          function(err) {
            if (err) {
              console.error('❌ 更新数据库记录失败:', err);
              console.error('  - 错误详情:', err.message);
            } else {
              console.log(`✅ 数据库TOS信息更新成功:`);
              console.log(`  - 影响行数: ${this.changes}`);
              console.log(`  - 录音ID: ${recordingId}`);
            }
          }
        );

        // 🚀 立即启动分包ASR处理 (新架构)
        console.log(`🎯 开始为录音 ${recordingId} 启动分包ASR处理`);
        
        // 异步处理，不阻塞响应
        setImmediate(async () => {
          try {
            const result = await processAudioWithChunking(filePath, recordingId, db);
            if (result.success) {
              console.log(`🎉 录音 ${recordingId} 分包ASR处理完成`);
            } else {
              console.error(`❌ 录音 ${recordingId} 分包ASR处理失败:`, result.error);
            }
          } catch (error) {
            console.error(`❌ 录音 ${recordingId} 分包ASR处理异常:`, error.message);
          }
        });

        // 📱 返回成功响应
        res.json({
          success: true,
          id: recordingId,
          recordingId: recordingId,
          filename: filename,
          originalname: originalname,
          tosKey: uploadResult.objectKey,
          message: '文件上传成功，正在启动分包ASR处理'
        });
      } else {
        console.error(`❌ TOS上传失败:`);
        console.error(`  - 成功标志: ${uploadResult.success}`);
        console.error(`  - 错误信息: ${uploadResult.error}`);
        throw new Error(uploadResult.error || 'TOS上传失败');
      }

    } catch (tosError) {
      console.error('❌ TOS上传异常:', tosError);
      console.error('  - 错误类型:', tosError.name);
      console.error('  - 错误消息:', tosError.message);
      console.error('  - 错误堆栈:', tosError.stack);
      
      // 更新数据库状态为失败
      console.log(`🔄 更新数据库状态为失败...`);
      db.run(
        `UPDATE recordings SET tos_upload_status = ?, error_message = ? WHERE id = ?`,
        ['failed', tosError.message, recordingId],
        function(err) {
          if (err) {
            console.error('❌ 更新失败状态失败:', err);
            console.error('  - 数据库错误:', err.message);
          } else {
            console.log(`✅ 已更新录音状态为失败:`);
            console.log(`  - 录音ID: ${recordingId}`);
            console.log(`  - 影响行数: ${this.changes}`);
            console.log(`  - 错误信息: ${tosError.message}`);
          }
        }
      );
      
      res.status(500).json({ 
        error: 'TOS上传失败', 
        details: tosError.message,
        recordingId: recordingId
      });
    }

  } catch (error) {
    console.error('❌ 上传处理异常:', error);
    console.error('  - 错误类型:', error.name);
    console.error('  - 错误消息:', error.message);
    console.error('  - 错误堆栈:', error.stack);
    console.error('  - 请求信息:', {
      hasFile: !!req.file,
      contentLength: req.get('Content-Length'),
      contentType: req.get('Content-Type')
    });
    
    res.status(500).json({ 
      error: '服务器错误', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});



// 📋 获取录音列表
app.get('/api/recordings', checkDatabase, (req, res) => {
  try {
    // 检查数据库是否已初始化 - 这个检查现在由中间件处理，但保留作为双重保险
    if (!db) {
      console.error('❌ 数据库未初始化');
      return res.status(500).json({ error: '数据库未就绪，请稍后重试' });
    }

    db.all(`
      SELECT 
        id, 
        filename, 
        original_name, 
        transcription, 
        status, 
        request_id,
        speaker_count,
        speaker_info,
        session_id,
        total_chunks,
        completed_chunks,
        completed_at,
        error_message,
        created_at 
      FROM recordings 
      ORDER BY created_at DESC 
      LIMIT 50
    `, (err, rows) => {
      if (err) {
        console.error('❌ 查询录音列表失败:', err);
        return res.status(500).json({ error: '查询失败' });
      }
      
      // 解析转录数据和说话人信息
      const recordings = rows.map(row => {
        let transcriptionData = null;
        let speakerData = null;
        
        if (row.transcription) {
          try {
            transcriptionData = JSON.parse(row.transcription);
          } catch (e) {
            transcriptionData = { text: row.transcription };
          }
        }
        
        if (row.speaker_info) {
          try {
            speakerData = JSON.parse(row.speaker_info);
          } catch (e) {
            speakerData = { summary: '说话人信息解析失败' };
          }
        }
        
        return {
          ...row,
          transcriptionData,
          speakerData
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
app.get('/api/recordings/:id', checkDatabase, (req, res) => {
  const recordingId = req.params.id;
  
  // 检查数据库是否已初始化 - 这个检查现在由中间件处理，但保留作为双重保险
  if (!db) {
    console.error('❌ 数据库未初始化');
    return res.status(500).json({ error: '数据库未就绪，请稍后重试' });
  }
  
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
    
    // 解析转录数据和说话人信息
    let transcriptionData = null;
    let speakerData = null;
    
    if (row.transcription) {
      try {
        transcriptionData = JSON.parse(row.transcription);
      } catch (e) {
        transcriptionData = { text: row.transcription };
      }
    }
    
    if (row.speaker_info) {
      try {
        speakerData = JSON.parse(row.speaker_info);
      } catch (e) {
        speakerData = { summary: '说话人信息解析失败' };
      }
    }
    
    res.json({
      ...row,
      transcriptionData,
      speakerData
    });
  });
});

// 🎵 音频文件服务
app.get('/api/audio/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 音频文件不存在: ${filename}`);
      return res.status(404).json({ error: '音频文件不存在' });
    }
    
    // 设置正确的 Content-Type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'audio/webm';
    
    switch (ext) {
      case '.webm':
        contentType = 'audio/webm';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.mp3':
        contentType = 'audio/mpeg';
        break;
      case '.ogg':
        contentType = 'audio/ogg';
        break;
      case '.m4a':
        contentType = 'audio/mp4';
        break;
      default:
        contentType = 'audio/webm';
    }
    
    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    // 发送文件
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('❌ 发送音频文件失败:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '音频文件发送失败' });
        }
      }
    });
    
    console.log(`🎵 已提供音频文件: ${filename}`);
    
  } catch (error) {
    console.error('❌ 音频文件服务错误:', error);
    res.status(500).json({ error: '音频文件服务错误' });
  }
});

// 🌐 获取TOS预签名URL
app.get('/api/tos-url/:id', (req, res) => {
  try {
    const recordingId = req.params.id;
    
    // 查询录音信息
    db.get(`
      SELECT tos_file_url, tos_upload_status, filename 
      FROM recordings 
      WHERE id = ?
    `, [recordingId], (err, row) => {
      if (err) {
        console.error('❌ 查询录音失败:', err);
        return res.status(500).json({ error: '查询失败' });
      }
      
      if (!row) {
        return res.status(404).json({ error: '录音不存在' });
      }
      
      // 检查TOS状态
      if (row.tos_upload_status !== 'completed' || !row.tos_file_url) {
        return res.status(404).json({ 
          error: 'TOS文件不可用',
          tos_status: row.tos_upload_status 
        });
      }
      
      // 返回TOS URL（这里应该是预签名URL，但为了简化先直接返回）
      res.json({
        url: row.tos_file_url,
        filename: row.filename
      });
      
      console.log(`🌐 已提供TOS URL: ${recordingId}`);
    });
    
  } catch (error) {
    console.error('❌ 获取TOS URL错误:', error);
    res.status(500).json({ error: 'TOS URL服务错误' });
  }
});

// 📄 下载转写文本
app.get('/api/download/:id', (req, res) => {
  try {
    const recordingId = req.params.id;
    
    // 查询录音信息
    db.get(`
      SELECT transcription, original_name, status 
      FROM recordings 
      WHERE id = ?
    `, [recordingId], (err, row) => {
      if (err) {
        console.error('❌ 查询录音失败:', err);
        return res.status(500).json({ error: '查询失败' });
      }
      
      if (!row) {
        return res.status(404).json({ error: '录音不存在' });
      }
      
      if (!row.transcription || row.status !== 'completed') {
        return res.status(400).json({ error: '转写未完成或无转写内容' });
      }
      
      // 解析转录数据
      let transcriptionText = row.transcription;
      try {
        const transcriptionData = JSON.parse(row.transcription);
        if (transcriptionData.text) {
          transcriptionText = transcriptionData.text;
        }
      } catch (e) {
        // 使用原始文本
      }
      
      // 设置下载响应头
      const filename = `${row.original_name}_transcription.txt`;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      // 发送文本内容
      res.send(transcriptionText);
      
      console.log(`📄 已下载转写文本: ${filename}`);
    });
    
  } catch (error) {
    console.error('❌ 下载转写文本错误:', error);
    res.status(500).json({ error: '下载服务错误' });
  }
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

// 🔄 重试失败的录音
app.post('/api/retry/:id', checkDatabase, async (req, res) => {
  const recordingId = req.params.id;
  
  try {
    console.log(`\n🔄 开始重试录音 ID: ${recordingId}`);
    
    // 查询录音信息
    const recording = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, filename, original_name, tos_upload_status, error_message FROM recordings WHERE id = ?',
        [recordingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!recording) {
      return res.status(404).json({ error: '录音不存在' });
    }
    
    console.log(`📁 录音文件: ${recording.filename}`);
    
    // 检查文件是否存在
    const filePath = path.join(uploadDir, recording.filename);
    if (!fs.existsSync(filePath)) {
      console.log(`❌ 文件不存在: ${filePath}`);
      return res.status(404).json({ error: '录音文件不存在，可能已被删除' });
    }
    
    const stats = fs.statSync(filePath);
    console.log(`📊 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // 重置状态
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE recordings SET tos_upload_status = ?, error_message = NULL WHERE id = ?',
        ['retrying', recordingId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    // 异步重试处理
    setImmediate(async () => {
      try {
        // 1. 重试TOS上传
        console.log(`🚀 重新上传到TOS...`);
        const uploadResult = await uploadFileToTos(filePath, recording.filename, recordingId);
        
        if (uploadResult.success) {
          console.log(`✅ TOS上传成功:`);
          console.log(`   对象键: ${uploadResult.objectKey}`);
          console.log(`   文件URL: ${uploadResult.fileUrl}`);
          
          // 更新数据库
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE recordings SET 
               tos_object_key = ?, 
               tos_file_url = ?, 
               tos_upload_status = ?,
               error_message = NULL
               WHERE id = ?`,
              [uploadResult.objectKey, uploadResult.fileUrl, 'completed', recordingId],
              function(err) {
                if (err) reject(err);
                else {
                  console.log(`✅ 数据库更新成功 (影响行数: ${this.changes})`);
                  resolve();
                }
              }
            );
          });
          
          // 2. 重试ASR处理
          console.log(`🎯 开始ASR处理...`);
          const asrResult = await processAudioWithChunking(filePath, recordingId, db);
          
          if (asrResult.success) {
            console.log(`🎉 录音 ${recordingId} 重试成功`);
          } else {
            console.log(`⚠️ ASR处理失败: ${asrResult.error}`);
          }
          
        } else {
          console.log(`❌ TOS上传仍然失败: ${uploadResult.error}`);
          
          // 更新错误信息
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE recordings SET tos_upload_status = ?, error_message = ? WHERE id = ?',
              ['failed', uploadResult.error, recordingId],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
        
      } catch (error) {
        console.log(`❌ 重试失败: ${error.message}`);
        
        // 更新错误信息
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE recordings SET tos_upload_status = ?, error_message = ? WHERE id = ?',
            ['failed', error.message, recordingId],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    });
    
    res.json({
      success: true,
      message: `录音 ${recordingId} 重试已启动`,
      recordingId: recordingId
    });
    
  } catch (error) {
    console.error('❌ 重试处理异常:', error);
    res.status(500).json({ 
      error: '重试失败', 
      details: error.message 
    });
  }
});

// 🔄 批量重试失败的录音
app.post('/api/retry-all', checkDatabase, async (req, res) => {
  try {
    console.log('\n🔄 开始批量重试失败的录音...');
    
    // 查找失败的录音
    const failedRecordings = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, filename, original_name, tos_upload_status, error_message
        FROM recordings 
        WHERE tos_upload_status = 'failed' OR tos_upload_status IS NULL
        ORDER BY created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (failedRecordings.length === 0) {
      return res.json({
        success: true,
        message: '没有找到需要重试的录音',
        retryCount: 0
      });
    }
    
    console.log(`📋 找到 ${failedRecordings.length} 个失败的录音`);
    
    // 异步批量重试
    setImmediate(async () => {
      let successCount = 0;
      let failCount = 0;
      
      for (const recording of failedRecordings) {
        try {
          console.log(`\n🔄 重试录音 ${recording.id}: ${recording.filename}`);
          
          const filePath = path.join(uploadDir, recording.filename);
          if (!fs.existsSync(filePath)) {
            console.log(`❌ 文件不存在: ${recording.filename}`);
            failCount++;
            continue;
          }
          
          // 重试上传和处理
          const uploadResult = await uploadFileToTos(filePath, recording.filename, recording.id);
          
          if (uploadResult.success) {
            // 更新数据库
            await new Promise((resolve, reject) => {
              db.run(
                `UPDATE recordings SET 
                 tos_object_key = ?, 
                 tos_file_url = ?, 
                 tos_upload_status = ?,
                 error_message = NULL
                 WHERE id = ?`,
                [uploadResult.objectKey, uploadResult.fileUrl, 'completed', recording.id],
                function(err) {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
            
            // ASR处理
            const asrResult = await processAudioWithChunking(filePath, recording.id, db);
            
            if (asrResult.success) {
              console.log(`✅ 录音 ${recording.id} 重试成功`);
              successCount++;
            } else {
              console.log(`⚠️ 录音 ${recording.id} ASR处理失败`);
              failCount++;
            }
            
          } else {
            console.log(`❌ 录音 ${recording.id} TOS上传失败`);
            failCount++;
          }
          
          // 添加延迟避免过于频繁的请求
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.log(`❌ 录音 ${recording.id} 重试异常:`, error.message);
          failCount++;
        }
      }
      
      console.log(`\n🏁 批量重试完成:`);
      console.log(`  ✅ 成功: ${successCount}`);
      console.log(`  ❌ 失败: ${failCount}`);
      console.log(`  📊 总计: ${failedRecordings.length}`);
    });
    
    res.json({
      success: true,
      message: `批量重试已启动，共 ${failedRecordings.length} 个录音`,
      retryCount: failedRecordings.length
    });
    
  } catch (error) {
    console.error('❌ 批量重试异常:', error);
    res.status(500).json({ 
      error: '批量重试失败', 
      details: error.message 
    });
  }
});

// 🩺 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 🩺 系统自检函数
async function performSystemCheck() {
  console.log('\n🩺 执行系统自检...');
  
  const checks = {
    database: false,
    uploads_dir: false,
    tos_config: false,
    env_file: false
  };
  
  // 检查数据库
  try {
    if (db) {
      await new Promise((resolve, reject) => {
        db.get('SELECT 1', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      checks.database = true;
      console.log('✅ 数据库连接正常');
    } else {
      console.log('❌ 数据库未初始化');
    }
  } catch (error) {
    console.log('❌ 数据库连接失败:', error.message);
  }
  
  // 检查uploads目录
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('📁 已创建uploads目录');
    }
    // 测试写入权限
    const testFile = path.join(uploadDir, 'test.tmp');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    checks.uploads_dir = true;
    console.log('✅ uploads目录可读写');
  } catch (error) {
    console.log('❌ uploads目录检查失败:', error.message);
  }
  
  // 检查.env文件
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    checks.env_file = true;
    console.log('✅ .env文件存在');
  } else {
    console.log('⚠️ .env文件不存在，使用默认配置');
  }
  
  // 检查TOS配置
  if (process.env.VOLC_ACCESSKEY && process.env.VOLC_SECRETKEY && process.env.TOS_BUCKET) {
    checks.tos_config = true;
    console.log('✅ TOS配置完整');
  } else {
    console.log('⚠️ TOS配置不完整，上传功能受限');
  }
  
  // 输出检查结果
  console.log('\n📊 系统自检结果:');
  Object.entries(checks).forEach(([key, status]) => {
    console.log(`  ${status ? '✅' : '❌'} ${key}: ${status ? '正常' : '异常'}`);
  });
  
  const healthyCount = Object.values(checks).filter(Boolean).length;
  const totalCount = Object.keys(checks).length;
  
  if (healthyCount === totalCount) {
    console.log('\n🎉 系统状态良好，所有功能可用');
  } else {
    console.log(`\n⚠️ 系统部分功能受限 (${healthyCount}/${totalCount} 正常)`);
    if (!checks.tos_config) {
      console.log('💡 要启用完整功能，请配置.env文件中的TOS设置');
    }
  }
}

// 🚀 启动服务器
app.listen(PORT, async () => {
  console.log(`\n🚀 服务器启动成功!`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`🎙️ 上传接口: http://localhost:${PORT}/upload`);
  console.log(`🔄 轮询接口: http://localhost:${PORT}/api/start-polling`);
  console.log(`📋 录音列表: http://localhost:${PORT}/api/recordings`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
  
  // 执行系统自检
  await performSystemCheck();
  
  console.log('\n🎯 服务器就绪，等待录音上传...\n');
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
