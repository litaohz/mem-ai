// 测试 sendCallback 可能的异常情况

// 模拟 makeHttpRequest 可能的返回值
function mockMakeHttpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    // 模拟不同的响应情况
    const scenarios = [
      // 正常响应
      { statusCode: 200, data: {} },
      // 无响应体
      { statusCode: 200 },
      // 错误响应
      { statusCode: 500, data: { error: 'Server error' } },
      // 无状态码
      { data: {} },
      // 完全空的响应
      undefined,
      null
    ];
    
    // 随机选择一个场景，这里我们测试有问题的场景
    const response = undefined; // 这可能是问题所在
    
    setTimeout(() => resolve(response), 50);
  });
}

// 模拟有问题的 sendCallback
async function problematicSendCallback(recordingId, result, error = null) {
  const CALLBACK_URL = 'https://223afc8d9014.ngrok-free.app/api/transcription-callback';
  
  try {
    const url = new URL(CALLBACK_URL);
    const postData = JSON.stringify({
      recordingId,
      transcript: result?.text || null,
      utterances: result?.utterances || null,
      audio_info: result?.audio_info || null,
      error: error
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
    
    console.log('📞 发送回调到:', CALLBACK_URL);
    const response = await mockMakeHttpRequest(options, postData);
    
    // 这里可能有问题！
    console.log('✅ 回调发送成功:', response.statusCode);
    console.log('响应对象:', response);
    
    // 如果 response 是 undefined，那么 response.statusCode 会是 undefined
    // 但这不会抛出异常，只是打印 undefined
    
  } catch (error) {
    console.error('❌ 发送回调失败:', error.message);
  }
}

// 测试
async function testProblematicCallback() {
  const result = {
    text: '测试文本',
    utterances: [],
    audio_info: { duration: 9120 }
  };
  
  await problematicSendCallback('test-id', result);
  console.log('回调函数执行完成');
}

// 运行测试
testProblematicCallback().catch(console.error);
