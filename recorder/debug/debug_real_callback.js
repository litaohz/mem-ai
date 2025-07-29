// 精确模拟你的 makeHttpRequest 函数
const https = require('https');
const http = require('http');

function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    console.log('发起请求到:', options.hostname + options.path);
    console.log('使用协议:', options.port === 443 ? 'https' : 'http');
    
    // 根据端口选择协议
    const requestModule = options.port === 443 ? https : http;
    
    const req = requestModule.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('收到响应状态码:', res.statusCode);
        console.log('响应数据:', data);
        
        if (options.hostname === 'openspeech.bytedance.com') {
          // 火山引擎ASR响应
          const result = {
            statusCode: res.headers['x-api-status-code'],
            message: res.headers['x-api-message'],
            logid: res.headers['x-tt-logid'],
            data: data ? JSON.parse(data) : {}
          };
          resolve(result);
        } else {
          // 回调响应 - 这里可能有问题
          const response = {
            statusCode: res.statusCode,
            data: data ? JSON.parse(data) : {}
          };
          console.log('准备返回的回调响应:', response);
          resolve(response);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('请求错误:', error.message);
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 测试回调到你的实际服务器
async function testRealCallback() {
  const CALLBACK_URL = 'https://223afc8d9014.ngrok-free.app/api/transcription-callback';
  
  try {
    const url = new URL(CALLBACK_URL);
    const postData = JSON.stringify({
      recordingId: 'test-debug',
      transcript: '测试转写结果',
      utterances: [],
      audio_info: { duration: 5000 },
      error: null
    });
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log('开始发送测试回调...');
    const response = await makeHttpRequest(options, postData);
    
    console.log('回调响应:', response);
    console.log('response.statusCode:', response.statusCode);
    console.log('response.statusCode 类型:', typeof response.statusCode);
    
  } catch (error) {
    console.error('回调失败:', error.message);
  }
}

// 测试回调到你的本地服务器
async function testLocalCallback() {
  const CALLBACK_URL = 'http://localhost:3000/api/transcription-callback';
  
  try {
    const url = new URL(CALLBACK_URL);
    const postData = JSON.stringify({
      recordingId: 'test-debug',
      transcript: '测试转写结果',
      utterances: [],
      audio_info: { duration: 5000 },
      error: null
    });
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log('开始发送测试回调到本地服务器...');
    const response = await makeHttpRequest(options, postData);
    
    console.log('回调响应:', response);
    console.log('response.statusCode:', response.statusCode);
    console.log('response.statusCode 类型:', typeof response.statusCode);
    
  } catch (error) {
    console.error('回调失败:', error.message);
  }
}

testLocalCallback();
