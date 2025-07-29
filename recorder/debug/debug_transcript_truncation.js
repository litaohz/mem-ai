// 测试transcript截断问题

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

console.log('准备发送的数据:');
console.log('- recordingId:', testData.recordingId);
console.log('- transcript长度:', testData.transcript.length);
console.log('- utterances数量:', testData.utterances.length);
console.log('');

// 测试JSON序列化
const jsonString = JSON.stringify(testData);
console.log('JSON序列化后长度:', jsonString.length);
console.log('JSON前200字符:', jsonString.substring(0, 200));
console.log('');

// 测试Buffer编码
const buffer = Buffer.from(jsonString, 'utf8');
console.log('UTF-8 Buffer长度:', buffer.length);
console.log('');

// 发送测试请求
try {
  const axios = require('axios');
  sendTestRequest();
} catch (error) {
  console.log('axios未安装，跳过HTTP测试');
}

async function sendTestRequest() {
  try {
    console.log('发送HTTP测试请求...');
    
    const response = await axios.post('http://localhost:3000/api/transcription-callback', testData, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
    
    console.log('✅ 请求成功');
    console.log('响应状态:', response.status);
    console.log('响应数据:', response.data);
    
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}
