// 测试callback_data功能
const http = require('http');

// 模拟带有callback_data的ASR回调
const mockAsrCallbackWithData = {
  result: {
    text: '这是一个测试ASR回调，包含callback_data信息。',
    utterances: [
      {
        text: '这是一个测试ASR回调，包含callback_data信息。',
        start_time: 0,
        end_time: 3000,
        definite: true
      }
    ]
  },
  audio_info: {
    duration: 3000,
    sample_rate: 16000,
    channels: 1
  },
  callback_data: JSON.stringify({
    recordingId: 'test-callback-data-123',
    requestId: 'req-456',
    timestamp: new Date().toISOString(),
    source: 'cloud_function',
    fileUrl: 'https://example.com/test.webm'
  })
};

// 发送测试回调
function sendTestCallback(testName, url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    
    console.log(`\n🧪 测试: ${testName}`);
    console.log(`📞 URL: ${url}`);
    console.log(`📊 数据:`, JSON.stringify(data, null, 2));
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData, 'utf8'),
        'User-Agent': 'VolcEngine-ASR-Test/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        console.log(`📤 响应状态: ${res.statusCode}`);
        console.log(`📥 响应数据: ${responseData}`);
        
        try {
          const parsedResponse = JSON.parse(responseData);
          console.log(`✅ ${testName} - 成功`);
          resolve({ statusCode: res.statusCode, data: parsedResponse });
        } catch (e) {
          console.log(`✅ ${testName} - 成功 (文本响应)`);
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ ${testName} - 失败:`, err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function testCallbackData() {
  console.log('🔧 测试callback_data功能');
  console.log('=' * 50);
  
  try {
    // 测试1: 有URL参数的recordingId
    await sendTestCallback(
      'callback_data测试 - 有URL参数',
      'http://localhost:3000/api/transcription-callback?recordingId=url-param-123&source=asr_callback',
      mockAsrCallbackWithData
    );

    console.log('\n' + '-'.repeat(30));

    // 测试2: 没有URL参数，从callback_data获取recordingId
    await sendTestCallback(
      'callback_data测试 - 从callback_data获取recordingId',
      'http://localhost:3000/api/transcription-callback?source=asr_callback',
      mockAsrCallbackWithData
    );

    console.log('\n' + '-'.repeat(30));

    // 测试3: callback_data格式错误
    const invalidCallbackData = {
      ...mockAsrCallbackWithData,
      callback_data: 'invalid-json-string'
    };
    
    await sendTestCallback(
      'callback_data测试 - 无效JSON',
      'http://localhost:3000/api/transcription-callback?source=asr_callback',
      invalidCallbackData
    );

    console.log('\n🎉 callback_data测试完成！');
    console.log('\n💡 优势:');
    console.log('1. callback_data提供了额外的上下文信息');
    console.log('2. 可以作为recordingId的备用来源');
    console.log('3. 便于调试和问题追踪');
    console.log('4. 包含请求的完整元数据');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  console.log('⏳ 3秒后开始测试...\n');
  setTimeout(() => {
    testCallbackData().catch(console.error);
  }, 3000);
}

module.exports = {
  testCallbackData,
  sendTestCallback,
  mockAsrCallbackWithData
};
