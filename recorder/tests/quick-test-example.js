// 快速测试示例 - 火山引擎ASR HTTP API
// 请将您的真实API密钥填入下面的配置中进行测试

const { submitAsrTask, queryAsrResult, pollAsrResult } = require('./test-asr-http');

// 配置您的API密钥
const CONFIG = {
  appKey: '7751295260',        // 替换为您的APP KEY
  accessKey: 'xK79OY0Vc8a1NnCo2XPuAEq1EUxDyGBc'   // 替换为您的ACCESS KEY
};

// 测试音频文件
const TEST_AUDIO_URL = 'https://bucket-bj-0720.tos-cn-beijing.volces.com/bf1fe530-eb2f-42db-938b-f19e4d96a65a.webm';

// 设置环境变量（临时方式，仅用于测试）
process.env.VOLC_APP_KEY = CONFIG.appKey;
process.env.VOLC_ACCESS_KEY = CONFIG.accessKey;

/**
 * 快速测试函数
 */
async function quickTest() {
  console.log('🚀 快速测试开始');
  console.log('音频文件:', TEST_AUDIO_URL);
  
  try {
    // 步骤1: 提交任务
    console.log('\n📤 步骤1: 提交ASR任务...');
    const submitResult = await submitAsrTask(TEST_AUDIO_URL, {
      enable_itn: true,           // 启用文本规范化
      enable_punc: true,          // 启用标点符号
      enable_speaker_info: false, // 不启用说话人分离
      show_utterances: true,      // 显示详细分句信息
      format: 'webm',             // 音频格式
      codec: 'opus'               // 编码格式
    });

    if (!submitResult.success) {
      console.error('❌ 任务提交失败:', submitResult.message);
      return;
    }

    console.log('✅ 任务提交成功，ID:', submitResult.requestId);

    // 步骤2: 等待处理
    console.log('\n⏳ 步骤2: 等待处理结果...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒

    // 步骤3: 查询结果
    console.log('\n📥 步骤3: 查询识别结果...');
    const result = await pollAsrResult(submitResult.requestId, 20, 2000);

    if (result.success) {
      console.log('\n🎉 识别成功！');
      console.log('\n📝 识别文本:');
      console.log('='.repeat(50));
      console.log(result.data.result.text);
      console.log('='.repeat(50));

      if (result.data.result.utterances) {
        console.log('\n📋 详细分句信息:');
        result.data.result.utterances.forEach((utterance, index) => {
          const startTime = (utterance.start_time / 1000).toFixed(2);
          const endTime = (utterance.end_time / 1000).toFixed(2);
          console.log(`${index + 1}. [${startTime}s-${endTime}s] ${utterance.text}`);
        });
      }

      if (result.data.audio_info) {
        console.log('\n🎵 音频信息:');
        console.log(`时长: ${(result.data.audio_info.duration / 1000).toFixed(2)}秒`);
      }

    } else {
      console.error('❌ 识别失败:', result.message);
      if (result.timeout) {
        console.log('💡 提示: 可能是音频文件较大，需要更长时间处理');
      }
    }

  } catch (error) {
    console.error('💥 测试异常:', error.message);
  }
}

/**
 * 单独测试提交任务
 */
async function testSubmitOnly() {
  console.log('🧪 测试提交任务...');
  
  const result = await submitAsrTask(TEST_AUDIO_URL, {
    format: 'webm',
    enable_itn: true,
    enable_punc: true
  });

  if (result.success) {
    console.log('✅ 提交成功，任务ID:', result.requestId);
    console.log('💡 您可以稍后使用此ID查询结果');
    return result.requestId;
  } else {
    console.error('❌ 提交失败:', result.message);
    return null;
  }
}

/**
 * 使用任务ID查询结果
 */
async function testQueryById(requestId) {
  console.log('🔍 查询任务结果，ID:', requestId);
  
  const result = await queryAsrResult(requestId);
  
  console.log('状态码:', result.statusCode);
  console.log('消息:', result.message);
  
  if (result.success) {
    console.log('✅ 查询成功');
    console.log('结果:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('⏳ 任务还在处理中或已失败');
  }
  
  return result;
}

// 检查配置并运行测试
if (require.main === module) {
  if (CONFIG.appKey === 'your_app_key_here' || CONFIG.accessKey === 'your_access_key_here') {
    console.log('⚠️  请先配置您的API密钥');
    console.log('编辑此文件的CONFIG对象，填入您的真实密钥：');
    console.log(`
const CONFIG = {
  appKey: 'your_actual_app_key_here',      // 您的APP KEY
  accessKey: 'your_actual_access_key_here' // 您的ACCESS KEY
};
    `);
    process.exit(1);
  }

  // 运行快速测试
  quickTest().then(() => {
    console.log('\n✅ 快速测试完成');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ 快速测试失败:', error.message);
    process.exit(1);
  });
}

module.exports = {
  quickTest,
  testSubmitOnly,
  testQueryById,
  CONFIG
}; 