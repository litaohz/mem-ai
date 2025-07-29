// 模拟云函数执行，特别关注 sendCallback 后的流程

const https = require('https');

// 模拟 sendCallback 函数
async function mockSendCallback(recordingId, result, error = null) {
  console.log('📞 开始发送回调...');
  
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('✅ 回调发送成功: 200');
  
  // 注意：这里没有显式返回值，JavaScript 会返回 undefined
}

// 模拟云函数的关键部分
async function mockCloudFunction() {
  console.log('=== 开始执行云函数 ===');
  
  try {
    const recordingId = 'test-id';
    const result = {
      text: '测试文本',
      utterances: [],
      audio_info: { duration: 9120 }
    };
    
    console.log('转写完成：', result.text);
    
    // 发送成功回调
    const callbackResult = await mockSendCallback(recordingId, result);
    console.log('sendCallback 返回值:', callbackResult);
    console.log('sendCallback 返回值类型:', typeof callbackResult);
    
    // 这里是关键：return 语句
    const response = { 
      statusCode: 200, 
      body: JSON.stringify({ 
        transcript: result.text,
        utterances: result.utterances,
        audio_info: result.audio_info,
        callback_sent: true
      }) 
    };
    
    console.log('准备返回的响应:', response);
    return response;
    
  } catch (err) {
    console.error('捕获到错误:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}

// 测试执行
async function runTest() {
  console.log('开始测试...\n');
  
  try {
    const result = await mockCloudFunction();
    console.log('\n=== 云函数执行结果 ===');
    console.log('返回值:', result);
    console.log('返回值类型:', typeof result);
    console.log('是否为 null/undefined:', result === null || result === undefined);
    
    // 模拟 FaaS 系统处理返回值
    if (result === null || result === undefined) {
      throw new Error('TypeError: Cannot convert undefined or null to object');
    }
    
    Object.entries(result);
    console.log('✅ FaaS 系统处理成功');
    
  } catch (error) {
    console.error('❌ FaaS 系统错误:', error.message);
  }
}

runTest();
