const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

// 从环境变量读取
const APP_KEY   = process.env.APP_KEY;      // 火山控制台「API 密钥管理」
const ACCESSKEY = process.env.ACCESSKEY;    // 同上
const REGION    = 'cn-beijing';             // 与 TOS bucket 同地域
const CALLBACK_URL = process.env.CALLBACK_URL; // 回调URL，如：https://your-domain.com/api/transcription-callback

// 🔧 修复版本：发送HTTP请求的通用函数
function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    // 根据端口或协议选择合适的模块
    const isHttps = options.port === 443 || options.protocol === 'https:' || 
                   options.hostname === 'openspeech.bytedance.com';
    const requestModule = isHttps ? https : http;
    
    const req = requestModule.request(options, res => {
      // 🔧 修复1: 使用Buffer数组收集数据，避免字符串拼接导致的编码问题
      const chunks = [];
      let totalLength = 0;
      
      res.on('data', chunk => {
        chunks.push(chunk);
        totalLength += chunk.length;
      });
      
      res.on('end', () => {
        // 🔧 修复2: 合并Buffer后再转换为UTF-8字符串
        const buffer = Buffer.concat(chunks, totalLength);
        const data = buffer.toString('utf8');
        
        console.log('📥 响应数据长度:', totalLength, 'bytes,', data.length, 'characters');
        
        if (options.hostname === 'openspeech.bytedance.com') {
          // 火山引擎ASR响应
          const result = {
            statusCode: res.headers['x-api-status-code'],
            message: res.headers['x-api-message'],
            logid: res.headers['x-tt-logid'],
            data: data ? JSON.parse(data) : {}
          };
          resolve(result);
        } else {
          // 回调响应
          resolve({
            statusCode: res.statusCode,
            data: data ? JSON.parse(data) : {}
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      // 🔧 修复3: 确保以UTF-8编码写入数据
      const buffer = Buffer.from(postData, 'utf8');
      req.write(buffer);
    }
    
    req.end();
  });
}

// 🔧 修复版本：发送回调到你的服务器
async function sendCallback(recordingId, result, error = null) {
  if (!CALLBACK_URL) {
    console.log('⚠️  未配置回调URL，跳过回调');
    return { success: false, reason: 'No callback URL configured' };
  }
  
  try {
    const url = new URL(CALLBACK_URL);
    const callbackData = {
      recordingId,
      transcript: result?.text || null,
      utterances: result?.utterances || null,
      audio_info: result?.audio_info || null,
      error: error
    };
    
    const postData = JSON.stringify(callbackData);
    
    // 🔧 修复4: 添加详细的编码日志
    console.log('📞 准备发送回调数据:');
    console.log('  - 数据对象:', callbackData);
    console.log('  - JSON字符串长度:', postData.length);
    console.log('  - UTF-8字节长度:', Buffer.byteLength(postData, 'utf8'));
    
    if (result?.text) {
      console.log('  - 转写文本:', result.text);
      console.log('  - 文本字符数:', result.text.length);
      console.log('  - 文本字节数:', Buffer.byteLength(result.text, 'utf8'));
    }
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        // 🔧 修复5: 明确指定charset=utf-8
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData, 'utf8'),
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
      }
    };
    
    console.log('📞 发送回调到:', CALLBACK_URL);
    const response = await makeHttpRequest(options, postData);
    console.log('✅ 回调发送成功:', response.statusCode);
    
    return { success: true, statusCode: response.statusCode };
    
  } catch (error) {
    console.error('❌ 发送回调失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 🔧 修复版本：统一请求函数
async function request(method, path, body = {}, requestId = null) {
  const postData = JSON.stringify(body);
  
  // 🔧 修复6: 添加请求数据的编码日志
  console.log('🔧 请求数据编码信息:');
  console.log('  - JSON字符串长度:', postData.length);
  console.log('  - UTF-8字节长度:', Buffer.byteLength(postData, 'utf8'));
  
  const headers = {
    // 🔧 修复7: 明确指定charset=utf-8
    'Content-Type': 'application/json; charset=utf-8',
    'X-Api-App-Key': APP_KEY,
    'X-Api-Access-Key': ACCESSKEY,
    'X-Api-Resource-Id': 'volc.bigasr.auc',
    // 🔧 修复8: 明确指定UTF-8编码计算字节长度
    'Content-Length': Buffer.byteLength(postData, 'utf8'),
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8'
  };
  
  // 添加必要的头部
  if (requestId) {
    headers['X-Api-Request-Id'] = requestId;
    headers['X-Api-Sequence'] = '-1';
  }
  
  const options = {
    hostname: 'openspeech.bytedance.com',
    path,
    method,
    headers
  };
  
  return makeHttpRequest(options, postData);
}

// 全局变量用于记录已处理的文件，防止重复处理
const processedFiles = new Set();

// 🔧 修复版本：云函数入口
exports.handler = async (event, context) => {
  let recordingId = null;
  
  try {
  
    
    console.log('原始事件：', JSON.stringify(event));

    // 1. 解析 TOS 事件
    const { bucket, object } = event.data.events[0].tos;
    const fileUrl = `https://${bucket.name}.tos-${REGION}.volces.com/${object.key}`;
    console.log('fileUrl', fileUrl);
    
    // 从文件名提取 recordingId
    // object.key 可能是 "recordings/2025/07/uuid/uuid.webm" 或 "uuid.webm"
    const keyParts = object.key.split('/');
    const filename = keyParts[keyParts.length - 1]; // 获取最后一部分文件名
    recordingId = filename.replace('.webm', ''); // 移除扩展名
    console.log('Object key:', object.key);
    console.log('Extracted Recording ID:', recordingId);
    
    // 2. 幂等性检查 - 防止重复处理
    const fileKey = `${object.eTag}_${recordingId}`;
    if (processedFiles.has(fileKey)) {
      console.log(`文件 ${recordingId} 已经处理过，跳过处理`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Already processed',
          recordingId: recordingId
        })
      };
    }
    
    // 标记为正在处理
    processedFiles.add(fileKey);
    
    // 生成唯一的请求ID
    const requestId = uuidv4();
    console.log('Request ID:', requestId);
    
    // 2. 提交任务（使用ASR原生callback）
    const callbackUrl = `${CALLBACK_URL}?recordingId=${recordingId}&source=asr_callback`;
    console.log('🔄 使用ASR直接回调模式，回调URL:', callbackUrl);
    
    const submitRes = await request('POST', '/api/v3/auc/bigmodel/submit', {
      user: { uid: context.requestId },
      audio: {
        format: 'webm',
        url: fileUrl,
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
        callback: callbackUrl,  // 添加ASR原生回调URL
        callback_data: JSON.stringify({
          recordingId: recordingId,
          requestId: requestId,
          timestamp: new Date().toISOString(),
          source: 'cloud_function',
          fileUrl: fileUrl
        })  // 添加回调数据，帮助识别请求
      }
    }, requestId);

    console.log('任务提交响应：', submitRes);
    
    // 检查提交是否成功
    if (submitRes.statusCode !== '20000000') {
      const errorMsg = `任务提交失败: ${submitRes.message}`;
      // 不再发送回调，因为ASR会直接回调
      throw new Error(errorMsg);
    }

    // 🚀 ASR直接回调模式：任务提交成功后立即返回
    console.log('✅ ASR任务提交成功，等待ASR直接回调到后端');
    console.log('📞 回调URL:', callbackUrl);
    console.log('🆔 Request ID:', requestId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'ASR task submitted successfully',
        recordingId: recordingId,
        requestId: requestId,
        callbackUrl: callbackUrl,
        mode: 'asr_direct_callback'
      })
    };
    
  } catch (err) {
    console.error('云函数执行错误:', err);
    
    // ASR直接回调模式：不在云函数中发送错误回调
    // 如果是任务提交失败，ASR不会回调，需要通知后端
    if (recordingId && err.message.includes('任务提交失败')) {
      console.log('⚠️ 任务提交失败，发送错误通知到后端');
      await sendCallback(recordingId, null, err.message);
    }
    
    // 确保总是返回一个有效的响应对象
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
        recordingId: recordingId,
        mode: 'asr_direct_callback'
      })
    };
  }
};

// 本地测试工具（仅在本地运行时生效）
if (require.main === module) {
  // 模拟云函数事件
  const mockEvent = {
    data: {
      events: [{
        tos: {
          bucket: { name: 'bucket-bj-0720' },
          object: { key: 'bf1fe530-eb2f-42db-938b-f19e4d96a65a.webm' }
        }
      }]
    }
  };
  
  // 模拟云函数上下文
  const mockContext = {
    requestId: 'test-' + Date.now()
  };
  
  // 运行测试
  exports.handler(mockEvent, mockContext).then(result => {
    console.log('🔧 本地测试结果：');
    console.log('返回值结构：', JSON.stringify(result, null, 2));
    console.log('实际返回内容：', result.body);
    
    // 解析返回内容
    try {
      const parsed = JSON.parse(result.body);
      console.log('📋 转写文本：', parsed.transcript);
      if (parsed.transcript) {
        console.log('📋 文本编码检查：');
        console.log('  - 字符长度:', parsed.transcript.length);
        console.log('  - 字节长度:', Buffer.byteLength(parsed.transcript, 'utf8'));
      }
      if (parsed.utterances) {
        console.log('📊 分句详情：', parsed.utterances);
      }
      if (parsed.audio_info) {
        console.log('🎵 音频信息：', parsed.audio_info);
      }
    } catch (e) {
      console.log('原始返回：', result.body);
    }
  }).catch(error => {
    console.error('🔧 测试失败：', error);
  });
}

module.exports = {
  makeHttpRequest,
  sendCallback,
  request,
  handler: exports.handler
};