// 测试云函数返回值的调试脚本

// 模拟 FaaS 运行时的 renderResponse 函数
function renderResponse(response) {
  console.log('输入的响应对象:', response);
  console.log('响应对象类型:', typeof response);
  console.log('响应对象是否为null:', response === null);
  console.log('响应对象是否为undefined:', response === undefined);
  
  if (response === null || response === undefined) {
    console.error('❌ 响应对象为 null 或 undefined!');
    return;
  }
  
  try {
    // 这里模拟 FaaS 系统调用 Object.entries
    const entries = Object.entries(response);
    console.log('✅ Object.entries 成功:', entries);
  } catch (error) {
    console.error('❌ Object.entries 失败:', error.message);
  }
}

// 测试不同的返回值场景
console.log('=== 测试场景 1: 正确的返回值 ===');
renderResponse({
  statusCode: 200,
  body: JSON.stringify({ message: 'success' })
});

console.log('\n=== 测试场景 2: undefined 返回值 ===');
renderResponse(undefined);

console.log('\n=== 测试场景 3: null 返回值 ===');
renderResponse(null);

console.log('\n=== 测试场景 4: 空对象 ===');
renderResponse({});

console.log('\n=== 测试场景 5: 缺少必要字段 ===');
renderResponse({ statusCode: 200 });

// 模拟你的云函数可能的返回值
console.log('\n=== 测试场景 6: 你的云函数返回值 ===');
const mockResult = {
  text: '现在是北京时间7:09感觉这个成功功能已经要成功。',
  utterances: [],
  audio_info: { duration: 9120 }
};

renderResponse({ 
  statusCode: 200, 
  body: JSON.stringify({ 
    transcript: mockResult.text,
    utterances: mockResult.utterances,
    audio_info: mockResult.audio_info,
    callback_sent: true
  }) 
});
