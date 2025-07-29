// 测试 JSON.stringify 处理 undefined 值的情况

function testJSONStringify() {
  console.log('=== 测试 JSON.stringify 处理 undefined ===');
  
  // 模拟可能的 result 对象
  const scenarios = [
    // 正常情况
    {
      text: '正常文本',
      utterances: [],
      audio_info: { duration: 9120 }
    },
    // text 为 undefined
    {
      text: undefined,
      utterances: [],
      audio_info: { duration: 9120 }
    },
    // utterances 为 undefined
    {
      text: '正常文本',
      utterances: undefined,
      audio_info: { duration: 9120 }
    },
    // audio_info 为 undefined
    {
      text: '正常文本',
      utterances: [],
      audio_info: undefined
    },
    // 所有都为 undefined
    {
      text: undefined,
      utterances: undefined,
      audio_info: undefined
    }
  ];
  
  scenarios.forEach((result, index) => {
    console.log(`\n--- 场景 ${index + 1} ---`);
    console.log('输入 result:', result);
    
    try {
      const response = { 
        statusCode: 200, 
        body: JSON.stringify({ 
          transcript: result.text,
          utterances: result.utterances,
          audio_info: result.audio_info,
          callback_sent: true
        }) 
      };
      
      console.log('✅ 成功生成响应');
      console.log('响应体:', response.body);
      
      // 测试是否能被 Object.entries 处理
      Object.entries(response);
      console.log('✅ Object.entries 处理成功');
      
    } catch (error) {
      console.error('❌ 错误:', error.message);
    }
  });
}

testJSONStringify();

// 额外测试：模拟云函数返回 undefined 的情况
console.log('\n=== 测试云函数返回 undefined ===');

function mockCloudFunction() {
  // 如果函数没有明确返回值，会返回 undefined
  console.log('函数执行中...');
  // 注意：这里没有 return 语句
}

const result = mockCloudFunction();
console.log('函数返回值:', result);
console.log('返回值类型:', typeof result);
