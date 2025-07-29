// 测试ASR直接回调功能
const http = require('http');

// 模拟ASR直接回调的测试数据
const mockAsrCallback = {
  status: 'success',
  result: {
    text: '这是一个测试的ASR直接回调转录结果。',
    utterances: [
      {
        text: '这是一个测试的ASR直接回调转录结果。',
        start_time: 0,
        end_time: 3000
      }
    ]
  },
  audio_info: {
    duration: 3000,
    sample_rate: 16000,
    channels: 1
  }
};

// 模拟云函数回调的测试数据（保持兼容性）
const mockCloudFunctionCallback = {
  recordingId: 'test-recording-id',
  transcript: '这是一个测试的云函数回调转录结果。',
  utterances: [
    {
      text: '这是一个测试的云函数回调转录结果。',
      start_time: 0,
      end_time: 3000
    }
  ],
  audio_info: {
    duration: 3000,
    sample_rate: 16000,
    channels: 1
  }
};

function testCallback(testName, url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        console.log(`\n=== ${testName} ===`);
        console.log('Status Code:', res.statusCode);
        console.log('Response:', responseData);
        resolve({ statusCode: res.statusCode, data: responseData });
      });
    });

    req.on('error', (err) => {
      console.error(`${testName} 失败:`, err);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 开始测试ASR回调功能...\n');
  
  try {
    // 测试1: ASR直接回调
    await testCallback(
      'ASR直接回调测试',
      'http://localhost:3000/api/transcription-callback?recordingId=test-asr-callback&source=asr_callback',
      mockAsrCallback
    );

    // 测试2: 云函数回调（兼容性测试）
    await testCallback(
      '云函数回调兼容性测试',
      'http://localhost:3000/api/transcription-callback?recordingId=test-cloud-function',
      mockCloudFunctionCallback
    );

    // 测试3: ASR错误回调
    await testCallback(
      'ASR错误回调测试',
      'http://localhost:3000/api/transcription-callback?recordingId=test-asr-error&source=asr_callback',
      {
        status: 'failed',
        error: 'ASR处理失败：音频质量不佳'
      }
    );

    console.log('\n✅ 所有测试完成！');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  console.log('请确保服务器正在运行在 http://localhost:3000');
  console.log('然后运行: node tests/test_asr_callback.js\n');
  
  // 延迟3秒后开始测试，给用户时间启动服务器
  setTimeout(runTests, 3000);
}

module.exports = { testCallback, runTests };