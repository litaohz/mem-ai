const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// 火山引擎ASR HTTP API配置
const ASR_CONFIG = {
  // 从火山引擎控制台获取
  appKey: process.env.VOLC_APP_KEY || '7751295260',
  accessKey: process.env.VOLC_ACCESS_KEY || 'xK79OY0Vc8a1NnCo2XPuAEq1EUxDyGBc',
  
  // API 地址
  submitUrl: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit',
  queryUrl: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/query',
  
  // 固定参数
  resourceId: 'volc.bigasr.auc',
  sequence: '-1'
};

// 您的音频文件地址
const AUDIO_URL = 'https://bucket-bj-0720.tos-cn-beijing.volces.com/bf1fe530-eb2f-42db-938b-f19e4d96a65a.webm';

/**
 * 生成请求头
 * @param {string} requestId - 请求ID
 * @returns {Object} 请求头
 */
function generateHeaders(requestId) {
  return {
    'Content-Type': 'application/json',
    'X-Api-App-Key': ASR_CONFIG.appKey,
    'X-Api-Access-Key': ASR_CONFIG.accessKey,
    'X-Api-Resource-Id': ASR_CONFIG.resourceId,
    'X-Api-Request-Id': requestId,
    'X-Api-Sequence': ASR_CONFIG.sequence
  };
}

/**
 * 提交ASR任务
 * @param {string} audioUrl - 音频文件URL
 * @param {Object} options - 可选参数
 * @returns {Promise<Object>} 提交结果
 */
async function submitAsrTask(audioUrl, options = {}) {
  const requestId = uuidv4();
  
  const requestBody = {
    user: {
      uid: options.uid || "test_user_" + Date.now()
    },
    audio: {
      format: options.format || "webm",  // 根据您的文件格式
      url: audioUrl,
      codec: options.codec || "opus",   // webm通常使用opus编码
      rate: options.rate || 16000,
      bits: options.bits || 16,
      channel: options.channel || 1
    },
    request: {
      model_name: "bigmodel",
      enable_itn: options.enable_itn !== false,  // 默认启用文本规范化
      enable_punc: options.enable_punc || false,  // 默认不启用标点
      enable_ddc: options.enable_ddc || false,   // 默认不启用顺滑
      enable_speaker_info: options.enable_speaker_info || false,  // 默认不启用说话人分离
      enable_channel_split: options.enable_channel_split || false, // 默认不启用双声道
      show_utterances: options.show_utterances !== false,  // 默认显示分句信息
      vad_segment: options.vad_segment || false,  // 默认使用语义分句
      end_window_size: options.end_window_size || 1000  // 默认1秒
    }
  };

  // 如果有回调地址
  if (options.callback) {
    requestBody.callback = options.callback;
  }
  
  // 如果有回调数据
  if (options.callback_data) {
    requestBody.callback_data = options.callback_data;
  }

  console.log('🎙️ 提交ASR任务...');
  console.log('Request ID:', requestId);
  console.log('音频URL:', audioUrl);
  console.log('请求参数:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await axios.post(ASR_CONFIG.submitUrl, requestBody, {
      headers: generateHeaders(requestId),
      timeout: 30000  // 30秒超时
    });

    const statusCode = response.headers['x-api-status-code'];
    const message = response.headers['x-api-message'];
    const logid = response.headers['x-tt-logid'];

    console.log('✅ 任务提交响应:');
    console.log('Status Code:', statusCode);
    console.log('Message:', message);
    console.log('Log ID:', logid);

    if (statusCode === '20000000') {
      console.log('✅ 任务提交成功！');
      return {
        success: true,
        requestId: requestId,
        message: message,
        logid: logid
      };
    } else {
      console.error('❌ 任务提交失败:', message);
      return {
        success: false,
        statusCode: statusCode,
        message: message,
        logid: logid
      };
    }

  } catch (error) {
    console.error('❌ 提交任务异常:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应头:', error.response.headers);
      console.error('响应数据:', error.response.data);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 查询ASR结果
 * @param {string} requestId - 任务ID
 * @returns {Promise<Object>} 查询结果
 */
async function queryAsrResult(requestId) {
  console.log('🔍 查询ASR结果...');
  console.log('Request ID:', requestId);

  try {
    const response = await axios.post(ASR_CONFIG.queryUrl, {}, {
      headers: generateHeaders(requestId),
      timeout: 30000
    });

    const statusCode = response.headers['x-api-status-code'];
    const message = response.headers['x-api-message'];
    const logid = response.headers['x-tt-logid'];

    console.log('📊 查询响应:');
    console.log('Status Code:', statusCode);
    console.log('Message:', message);
    console.log('Log ID:', logid);

    const result = {
      statusCode: statusCode,
      message: message,
      logid: logid,
      data: response.data
    };

    // 根据状态码判断结果
    switch (statusCode) {
      case '20000000':
        console.log('✅ 识别成功！');
        console.log('识别结果:', JSON.stringify(response.data, null, 2));
        result.success = true;
        break;
      case '20000001':
        console.log('⏳ 正在处理中...');
        result.success = false;
        result.processing = true;
        break;
      case '20000002':
        console.log('⏳ 任务在队列中...');
        result.success = false;
        result.queued = true;
        break;
      case '20000003':
        console.log('🔇 静音音频');
        result.success = false;
        result.silent = true;
        break;
      default:
        console.log('❌ 处理失败:', message);
        result.success = false;
        break;
    }

    return result;

  } catch (error) {
    console.error('❌ 查询结果异常:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应头:', error.response.headers);
      console.error('响应数据:', error.response.data);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 轮询查询结果直到完成
 * @param {string} requestId - 任务ID
 * @param {number} maxAttempts - 最大尝试次数
 * @param {number} interval - 查询间隔(毫秒)
 * @returns {Promise<Object>} 最终结果
 */
async function pollAsrResult(requestId, maxAttempts = 30, interval = 2000) {
  console.log(`🔄 开始轮询查询结果，最大尝试次数: ${maxAttempts}，间隔: ${interval}ms`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n--- 第 ${attempt} 次查询 ---`);
    
    const result = await queryAsrResult(requestId);
    
    if (result.success) {
      console.log('🎉 识别完成！');
      return result;
    }
    
    if (result.processing || result.queued) {
      console.log(`⏳ 继续等待... (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, interval));
      continue;
    }
    
    // 其他错误情况
    console.log('❌ 处理失败，停止轮询');
    return result;
  }
  
  console.log('⏰ 轮询超时，请稍后手动查询');
  return {
    success: false,
    timeout: true,
    message: '轮询超时'
  };
}

/**
 * 完整的ASR测试流程
 */
async function testAsrComplete() {
  console.log('🚀 开始火山引擎ASR HTTP API测试');
  console.log('='.repeat(50));
  
  // 检查配置
  if (ASR_CONFIG.appKey === 'your_app_key_here' || ASR_CONFIG.accessKey === 'your_access_key_here') {
    console.log('⚠️  请先配置您的火山引擎API密钥');
    console.log('请在环境变量中设置:');
    console.log('- VOLC_APP_KEY: 您的APP KEY');
    console.log('- VOLC_ACCESS_KEY: 您的ACCESS KEY');
    console.log('\n或者直接修改代码中的ASR_CONFIG配置');
    return {
      success: false,
      error: '配置缺失'
    };
  }

  try {
    // 第一步：提交任务
    const submitResult = await submitAsrTask(AUDIO_URL, {
      enable_itn: true,           // 启用文本规范化
      enable_punc: true,          // 启用标点符号
      enable_speaker_info: false, // 不启用说话人分离
      show_utterances: true,      // 显示详细分句信息
      format: 'webm'              // 指定音频格式
    });

    if (!submitResult.success) {
      console.error('❌ 任务提交失败，测试终止');
      return submitResult;
    }

    console.log('\n⏳ 等待2秒后开始查询结果...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 第二步：轮询查询结果
    const finalResult = await pollAsrResult(submitResult.requestId);
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 测试完成');
    
    if (finalResult.success && finalResult.data?.result) {
      console.log('\n📝 识别文本:');
      console.log(finalResult.data.result.text);
      
      if (finalResult.data.result.utterances) {
        console.log('\n📋 详细分句信息:');
        finalResult.data.result.utterances.forEach((utterance, index) => {
          console.log(`${index + 1}. [${utterance.start_time}ms-${utterance.end_time}ms] ${utterance.text}`);
        });
      }
      
      if (finalResult.data.audio_info) {
        console.log('\n🎵 音频信息:');
        console.log(`时长: ${finalResult.data.audio_info.duration}ms`);
      }
    }
    
    return finalResult;

  } catch (error) {
    console.error('❌ 测试过程异常:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  console.log('火山引擎ASR HTTP API 测试工具');
  console.log('音频文件:', AUDIO_URL);
  console.log('');
  
  testAsrComplete().then(result => {
    if (result.success) {
      console.log('\n✅ 测试成功完成！');
      process.exit(0);
    } else {
      console.log('\n❌ 测试失败');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 测试异常:', error);
    process.exit(1);
  });
}

module.exports = {
  submitAsrTask,
  queryAsrResult,
  pollAsrResult,
  testAsrComplete,
  ASR_CONFIG
}; 