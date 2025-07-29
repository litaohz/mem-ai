// ASR回调调试工具
const express = require('express');

// 创建一个简单的调试服务器，监听所有回调
const debugApp = express();
debugApp.use(express.json({ limit: '50mb' }));
debugApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 记录所有请求的中间件
debugApp.use((req, res, next) => {
  console.log('\n🔍 收到请求:');
  console.log('时间:', new Date().toISOString());
  console.log('方法:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  next();
});

// 处理所有路径的POST请求
debugApp.post('*', (req, res) => {
  console.log('\n📥 ASR回调数据分析:');
  console.log('路径:', req.path);
  console.log('Query参数:', req.query);
  console.log('请求体:', JSON.stringify(req.body, null, 2));
  
  // 检查是否是ASR回调
  if (req.path.includes('transcription-callback')) {
    console.log('✅ 这是ASR转录回调');
    
    // 分析回调数据格式
    if (req.body.result) {
      console.log('📊 检测到标准ASR结果格式');
      console.log('转录文本:', req.body.result.text);
      console.log('分句数量:', req.body.result.utterances?.length || 0);
    } else {
      console.log('⚠️ 非标准ASR结果格式，原始数据:');
      console.log(JSON.stringify(req.body, null, 2));
    }
  }
  
  // 返回成功响应
  res.json({ 
    success: true, 
    message: '调试服务器已接收',
    timestamp: new Date().toISOString()
  });
});

// 处理所有路径的GET请求
debugApp.get('*', (req, res) => {
  console.log('\n📥 GET请求:');
  console.log('路径:', req.path);
  console.log('Query:', req.query);
  
  res.json({ 
    message: 'ASR回调调试服务器正在运行',
    path: req.path,
    query: req.query,
    timestamp: new Date().toISOString()
  });
});

const PORT = 3001;
debugApp.listen(PORT, () => {
  console.log(`🔍 ASR回调调试服务器启动`);
  console.log(`🌐 监听端口: ${PORT}`);
  console.log(`📞 调试URL: http://localhost:${PORT}/api/transcription-callback`);
  console.log('\n💡 使用方法:');
  console.log('1. 启动ngrok: ngrok http 3001');
  console.log('2. 将ngrok URL配置到云函数的CALLBACK_URL');
  console.log('3. 上传音频文件测试');
  console.log('4. 观察此服务器的日志输出');
  console.log('\n等待ASR回调中...\n');
});

module.exports = debugApp;
