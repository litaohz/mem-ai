// 火山引擎配置模板
// 复制此文件为 volc-engine.js 并填入真实配置

const { AsrClient } = require('@volcengine/sdk');

// 火山引擎 ASR 配置
const volcEngineConfig = {
  // 从火山引擎控制台获取
  accessKey: process.env.VOLC_ACCESS_KEY || 'your_access_key_here',
  secretKey: process.env.VOLC_SECRET_KEY || 'your_secret_key_here',
  
  // 服务区域
  region: process.env.VOLC_REGION || 'cn-north-1',
  
  // ASR 服务配置
  asr: {
    // 服务版本
    version: '2022-08-26',
    
    // 音频格式配置
    format: 'wav',        // wav, mp3, aac, m4a
    sampleRate: 16000,    // 采样率
    channels: 1,          // 声道数
    
    // 识别参数
    language: 'zh-CN',    // 语言
    model: 'general',     // 模型类型
    
    // 高级功能
    enableSpeakerDiarization: true,  // 说话人分离
    enablePunctuation: true,         // 标点符号
    enableWordTimestamp: true,       // 词级时间戳
    
    // 回调配置
    callbackUrl: process.env.CALLBACK_URL || null
  },
  
  // TOS 对象存储配置 (用于存储音频文件)
  tos: {
    bucket: process.env.TOS_BUCKET || 'your-bucket-name',
    region: process.env.TOS_REGION || 'cn-north-1',
    endpoint: process.env.TOS_ENDPOINT || 'tos-s3-cn-north-1.volces.com'
  }
};

// 创建 ASR 客户端
function createAsrClient() {
  if (!volcEngineConfig.accessKey || volcEngineConfig.accessKey === 'your_access_key_here') {
    console.warn('⚠️  火山引擎配置未设置，使用模拟模式');
    return null;
  }

  try {
    const client = new AsrClient({
      region: volcEngineConfig.region,
      accessKeyId: volcEngineConfig.accessKey,
      secretAccessKey: volcEngineConfig.secretKey
    });
    
    console.log('✅ 火山引擎 ASR 客户端初始化成功');
    return client;
  } catch (error) {
    console.error('❌ 火山引擎 ASR 客户端初始化失败:', error);
    return null;
  }
}

// ASR 转写函数
async function transcribeAudio(filePath, options = {}) {
  const client = createAsrClient();
  
  if (!client) {
    // 返回模拟结果
    return {
      success: false,
      message: '使用模拟转写模式',
      transcription: `这是模拟转写结果。\n\n文件: ${filePath}\n时间: ${new Date().toLocaleString()}\n\n在生产环境中，这里会是真实的语音识别结果。`
    };
  }

  try {
    const params = {
      // 音频文件路径或 URL
      audio: filePath,
      
      // 合并配置
      ...volcEngineConfig.asr,
      ...options
    };

    console.log('🎙️ 开始 ASR 转写:', filePath);
    
    // 调用火山引擎 ASR API
    const result = await client.submitAsrTask(params);
    
    if (result.success) {
      console.log('✅ ASR 转写成功');
      return {
        success: true,
        taskId: result.taskId,
        transcription: result.transcription || '转写中...',
        speakers: result.speakers || [],
        timestamps: result.timestamps || []
      };
    } else {
      console.error('❌ ASR 转写失败:', result.message);
      return {
        success: false,
        message: result.message || 'ASR 转写失败'
      };
    }
    
  } catch (error) {
    console.error('❌ ASR 转写异常:', error);
    return {
      success: false,
      message: error.message || 'ASR 转写异常'
    };
  }
}

// 查询转写状态
async function getTranscriptionStatus(taskId) {
  const client = createAsrClient();
  
  if (!client) {
    return {
      success: false,
      message: '模拟模式不支持状态查询'
    };
  }

  try {
    const result = await client.getAsrTaskResult(taskId);
    
    return {
      success: true,
      status: result.status,        // pending, processing, completed, failed
      transcription: result.transcription,
      progress: result.progress,
      speakers: result.speakers,
      timestamps: result.timestamps
    };
    
  } catch (error) {
    console.error('❌ 查询转写状态失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// 上传音频到 TOS
async function uploadAudioToTOS(filePath, fileName) {
  // 这里可以实现文件上传到火山引擎 TOS 的逻辑
  // 暂时返回本地路径
  return {
    success: true,
    url: filePath,
    message: '本地存储模式'
  };
}

module.exports = {
  volcEngineConfig,
  createAsrClient,
  transcribeAudio,
  getTranscriptionStatus,
  uploadAudioToTOS
};

/* 使用示例:

const { transcribeAudio } = require('./config/volc-engine');

// 转写音频
async function processAudio(filePath) {
  const result = await transcribeAudio(filePath, {
    enableSpeakerDiarization: true,
    language: 'zh-CN'
  });
  
  if (result.success) {
    console.log('转写结果:', result.transcription);
  } else {
    console.error('转写失败:', result.message);
  }
}

*/ 