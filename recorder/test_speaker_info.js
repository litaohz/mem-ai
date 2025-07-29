// 🎯 测试说话人识别功能
const { request } = require('./faas/cloud_function_vocal');

// 模拟环境变量（请替换为你的实际值）
process.env.APP_KEY = 'your_app_key';
process.env.ACCESSKEY = 'your_access_key';

async function testSpeakerInfo() {
  console.log('🎯 开始测试说话人识别功能...\n');
  
  // 1. 模拟提交带有说话人识别的ASR任务
  const testFileUrl = 'https://your-test-file-url.webm'; // 替换为你的测试文件URL
  const requestId = 'test-speaker-' + Date.now();
  
  try {
    console.log('📤 提交ASR任务（启用说话人识别）...');
    
    const submitResult = await request('POST', '/api/v3/auc/bigmodel/submit', {
      user: { uid: 'test-user' },
      audio: {
        format: 'webm',
        url: testFileUrl,
        codec: 'opus',
        rate: 16000,
        bits: 16,
        channel: 1
      },
      request: {
        model_name: 'bigmodel',
        enable_speaker_info: true,
        enable_punc: true,
        enable_itn: true,
        show_utterances: true,
        with_speaker_info: true,  // 🎯 启用说话人识别
        speaker_number: 'auto'    // 🎯 自动检测说话人数量
      }
    }, requestId);
    
    console.log('✅ 任务提交结果:');
    console.log('  状态码:', submitResult.statusCode);
    console.log('  消息:', submitResult.message);
    console.log('  日志ID:', submitResult.logid);
    console.log('  请求ID:', requestId);
    
    if (submitResult.statusCode === '20000000') {
      console.log('\n🔄 任务提交成功，可以开始轮询结果...');
      
      // 2. 模拟轮询结果（实际应用中由后端自动轮询）
      console.log('💡 提示：实际应用中，后端会自动轮询以下接口获取结果:');
      console.log(`   POST /api/v3/auc/bigmodel/query`);
      console.log(`   Body: { "user": { "uid": "test-user" }, "request": { "id": "${requestId}" } }`);
      
      // 演示查询接口的调用方式
      setTimeout(async () => {
        try {
          console.log('\n🔍 演示查询结果接口...');
          const queryResult = await request('POST', '/api/v3/auc/bigmodel/query', {
            user: { uid: 'test-user' },
            request: { id: requestId }
          });
          
          console.log('📊 查询结果:');
          console.log('  状态码:', queryResult.statusCode);
          console.log('  消息:', queryResult.message);
          
          if (queryResult.data) {
            console.log('  数据:', JSON.stringify(queryResult.data, null, 2));
            
            // 检查说话人信息
            if (queryResult.data.utterances) {
              console.log('\n🎤 说话人识别结果分析:');
              queryResult.data.utterances.forEach((utterance, index) => {
                console.log(`  片段 ${index + 1}:`);
                console.log(`    说话人: ${utterance.speaker || '未识别'}`);
                console.log(`    时间: ${utterance.start_time}ms - ${utterance.end_time}ms`);
                console.log(`    内容: ${utterance.text}`);
                console.log('');
              });
            }
          }
          
        } catch (queryError) {
          console.log('⚠️ 查询结果演示失败（这是正常的，因为没有实际的音频文件）:', queryError.message);
        }
      }, 3000);
      
    } else {
      console.log('❌ 任务提交失败:', submitResult.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.log('\n💡 请确保：');
    console.log('  1. 已设置正确的APP_KEY和ACCESSKEY环境变量');
    console.log('  2. 网络连接正常');
    console.log('  3. 火山引擎API配额充足');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  console.log('🧪 说话人识别功能测试');
  console.log('=' * 50);
  
  // 检查环境变量
  if (!process.env.APP_KEY || !process.env.ACCESSKEY) {
    console.log('⚠️ 请先设置环境变量:');
    console.log('  $env:APP_KEY = "your_app_key"');
    console.log('  $env:ACCESSKEY = "your_access_key"');
    console.log('');
    console.log('或者直接在此文件中修改对应的值');
    process.exit(1);
  }
  
  testSpeakerInfo().then(() => {
    console.log('\n🎉 测试完成!');
  }).catch(error => {
    console.error('💥 测试过程中出现错误:', error);
  });
}

module.exports = { testSpeakerInfo };
