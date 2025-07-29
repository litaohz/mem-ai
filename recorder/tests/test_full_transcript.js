// 使用内置http模块测试transcript截断问题

const http = require('http');

const completeText = '真北是指导你行动的道德指南，源自你最真实的信仰、价值观和领导准则。所谓内心的指北针，代表的是你内心最深处的自己。但忙碌的现代人、企业人、基层人、干活人可能会叹气地说好些时候真的是找不到北啊。这里面要找到的北，不只是发展方向、成长道路、战略规划意义上的，更内涵着自我觉察、自我接纳，进而由自我关爱走向自我实现意义上的。';

console.log('=== 测试transcript截断问题 ===');
console.log('完整文本长度:', completeText.length);
console.log('完整文本:', completeText);
console.log('');

// 模拟发送HTTP请求
const testData = {
  recordingId: "6e3cd130-38ff-4849-b11c-9e0e988b3f56", 
  transcript: completeText,
  utterances: [
    {
      text: completeText,
      start_time: 0,
      end_time: 9120
    }
  ],
  audio_info: {
    duration: 9120
  }
};

const jsonData = JSON.stringify(testData);
console.log('准备发送的JSON数据长度:', jsonData.length);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/transcription-callback',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(jsonData, 'utf8')
  }
};

console.log('发送HTTP请求...');
console.log('Content-Length:', options.headers['Content-Length']);

const req = http.request(options, (res) => {
  console.log('响应状态码:', res.statusCode);
  console.log('响应头:', res.headers);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('响应完成');
    console.log('响应数据:', responseData);
    
    // 检查数据库中的结果
    setTimeout(() => {
      console.log('\n检查数据库中的保存结果...');
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database('./recordings.db');
      
      db.get(
        'SELECT transcription FROM recordings WHERE id = ?',
        [testData.recordingId],
        (err, row) => {
          if (!err && row) {
            try {
              const data = JSON.parse(row.transcription);
              console.log('数据库中保存的文本长度:', data.text ? data.text.length : 'undefined');
              console.log('数据库中保存的文本:', data.text);
              console.log('');
              console.log('比较结果:');
              console.log('- 原始文本长度:', completeText.length);
              console.log('- 保存文本长度:', data.text ? data.text.length : 0);
              console.log('- 是否截断:', data.text !== completeText ? '是' : '否');
            } catch (e) {
              console.log('JSON解析错误:', e.message);
            }
          } else {
            console.log('查询失败或记录不存在');
          }
          db.close();
        }
      );
    }, 1000);
  });
});

req.on('error', (error) => {
  console.error('请求错误:', error.message);
});

req.write(jsonData);
req.end();
