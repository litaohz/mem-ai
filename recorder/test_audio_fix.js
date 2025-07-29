const express = require('express');
const path = require('path');
const fs = require('fs');

// 创建测试应用
const app = express();
const uploadDir = path.join(__dirname, 'uploads');

// 音频文件服务端点
app.get('/api/audio/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    console.log(`🔍 请求音频文件: ${filename}`);
    console.log(`📂 文件路径: ${filePath}`);
    
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
    
    console.log(`🎵 Content-Type: ${contentType}`);
    
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
      } else {
        console.log(`✅ 成功发送音频文件: ${filename}`);
      }
    });
    
  } catch (error) {
    console.error('❌ 音频文件服务错误:', error);
    res.status(500).json({ error: '音频文件服务错误' });
  }
});

// 测试端点
app.get('/test', (req, res) => {
  const files = fs.readdirSync(uploadDir);
  res.json({
    message: '音频服务测试',
    availableFiles: files,
    testUrls: files.map(file => `/api/audio/${file}`)
  });
});

// 启动测试服务器
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🧪 测试服务器启动在 http://localhost:${PORT}`);
  console.log(`📋 测试端点: http://localhost:${PORT}/test`);
  console.log(`🎵 音频测试: http://localhost:${PORT}/api/audio/1753777920222-445715169.webm`);
});
