const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

// 从环境变量读取
const APP_KEY   = process.env.APP_KEY;      // 火山控制台「API 密钥管理」
const ACCESSKEY = process.env.ACCESSKEY;    // 同上
const REGION    = 'cn-beijing';             // 与 TOS bucket 同地域
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000'; // 后端服务地址

// 🔧 发送HTTP请求的通用函数
function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    // 根据端口或协议选择合适的模块
    const isHttps = options.port === 443 || options.protocol === 'https:' || 
                   options.hostname === 'openspeech.bytedance.com';
    const requestModule = isHttps ? https : http;
    
    const req = requestModule.request(options, res => {
      const chunks = [];
      let totalLength = 0;
      
      res.on('data', chunk => {
        chunks.push(chunk);
        totalLength += chunk.length;
      });
      
      res.on('end', () => {
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
          // 后端响应
          resolve({
            statusCode: res.statusCode,
            data: data ? JSON.parse(data) : {}
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      const buffer = Buffer.from(postData, 'utf8');
      req.write(buffer);
    }
    
    req.end();
  });
}

// 🚀 新架构：通知后端启动轮询
async function notifyBackendStartPolling(recordingId, requestId) {
  if (!BACKEND_URL) {
    console.log('⚠️  未配置后端URL，跳过轮询通知');
    return { success: false, reason: 'No backend URL configured' };
  }
  
  try {
    const url = new URL(`${BACKEND_URL}/api/start-polling`);
    const pollingData = {
      recordingId,
      requestId,
      source: 'cloud_function',
      timestamp: new Date().toISOString()
    };
    
    const postData = JSON.stringify(pollingData);
    
    console.log('🔄 通知后端启动轮询:');
    console.log('  - 录音ID:', recordingId);
    console.log('  - 请求ID:', requestId);
    console.log('  - 后端URL:', `${BACKEND_URL}/api/start-polling`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData, 'utf8'),
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
      }
    };
    
    console.log('🔄 发送轮询启动请求到后端...');
    const response = await makeHttpRequest(options, postData);
    console.log('✅ 轮询启动通知成功:', response.statusCode);
    
    return { success: true, statusCode: response.statusCode, data: response.data };
    
  } catch (error) {
    console.error('❌ 通知后端启动轮询失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 统一请求函数
async function request(method, path, body = {}, requestId = null) {
  const postData = JSON.stringify(body);
  
  console.log('🔧 ASR请求数据编码信息:');
  console.log('  - JSON字符串长度:', postData.length);
  console.log('  - UTF-8字节长度:', Buffer.byteLength(postData, 'utf8'));
  
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Api-App-Key': APP_KEY,
    'X-Api-Access-Key': ACCESSKEY,
    'X-Api-Resource-Id': 'volc.bigasr.auc',
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

// 🚀 新架构云函数入口 (轮询模式)
exports.handler = async (event, context) => {
  let recordingId = null;
  
  try {
    console.log('\n🚀 新架构云函数启动 - 轮询模式');
    console.log('原始事件：', JSON.stringify(event));

    // 1. 解析 TOS 事件
    const { bucket, object } = event.data.events[0].tos;
    const fileUrl = `https://${bucket.name}.tos-${REGION}.volces.com/${object.key}`;
    console.log('📁 文件URL:', fileUrl);
    
    // 从文件名提取 recordingId
    const keyParts = object.key.split('/');
    const filename = keyParts[keyParts.length - 1];
    recordingId = filename.replace('.webm', '');
    console.log('📄 Object key:', object.key);
    console.log('🆔 录音ID:', recordingId);
    
    // 2. 幂等性检查 - 防止重复处理
    const fileKey = `${object.eTag}_${recordingId}`;
    if (processedFiles.has(fileKey)) {
      console.log(`⚠️ 文件 ${recordingId} 已经处理过，跳过处理`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Already processed',
          recordingId: recordingId,
          mode: 'polling_architecture'
        })
      };
    }
    
    // 标记为正在处理
    processedFiles.add(fileKey);
    
    // 3. 生成唯一的请求ID
    const requestId = uuidv4();
    console.log('🎯 生成请求ID:', requestId);
    
    // 4. 提交ASR任务（无回调模式）
    console.log('🚀 提交ASR任务（轮询模式，无回调）...');
    
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
        show_utterances: true
        // 🚀 新架构：不设置回调，后端会通过轮询获取结果
      }
    }, requestId);

    console.log('📋 任务提交响应：', submitRes);
    
    // 5. 检查提交是否成功
    if (submitRes.statusCode !== '20000000') {
      const errorMsg = `ASR任务提交失败: ${submitRes.message} (${submitRes.statusCode})`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('✅ ASR任务提交成功，开始通知后端启动轮询...');
    
    // 6. 🚀 新架构核心：通知后端启动轮询服务
    const pollingResult = await notifyBackendStartPolling(recordingId, requestId);
    
    if (!pollingResult.success) {
      console.error('❌ 通知后端启动轮询失败:', pollingResult.error);
      throw new Error(`启动轮询失败: ${pollingResult.error}`);
    }

    console.log('🎉 新架构部署成功！');
    console.log('📊 流程总结:');
    console.log('  1. ✅ TOS事件触发云函数');
    console.log('  2. ✅ 云函数提交ASR任务');
    console.log('  3. ✅ 获取requestId:', requestId);
    console.log('  4. ✅ 通知后端启动轮询');
    console.log('  5. 🔄 后端将每10秒轮询ASR结果');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'New polling architecture deployed successfully',
        recordingId: recordingId,
        requestId: requestId,
        architecture: 'polling',
        flow: [
          '文件上传 → 后端存储',
          '上传到TOS → TOS事件触发云函数',
          '云函数提交ASR任务 → 获取requestId',
          '通知后端启动轮询 → 后端每10秒查询结果',
          '轮询直到完成 → 保存最终转录结果'
        ],
        pollingStatus: pollingResult.data
      })
    };
    
  } catch (err) {
    console.error('❌ 新架构云函数执行错误:', err);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message,
        recordingId: recordingId,
        architecture: 'polling',
        message: 'Cloud function execution failed'
      })
    };
  }
};

// 本地测试工具
if (require.main === module) {
  // 模拟云函数事件
  const mockEvent = {
    data: {
      events: [{
        tos: {
          bucket: { name: 'bucket-bj-0720' },
          object: { 
            key: 'bf1fe530-eb2f-42db-938b-f19e4d96a65a.webm',
            eTag: 'test-etag-123'
          }
        }
      }]
    }
  };
  
  // 模拟云函数上下文
  const mockContext = {
    requestId: 'test-' + Date.now()
  };
  
  console.log('🧪 开始本地测试新架构...');
  
  // 运行测试
  exports.handler(mockEvent, mockContext).then(result => {
    console.log('\n🔧 本地测试结果：');
    console.log('状态码：', result.statusCode);
    console.log('响应体：', JSON.stringify(JSON.parse(result.body), null, 2));
  }).catch(error => {
    console.error('🔧 测试失败：', error);
  });
}

module.exports = {
  makeHttpRequest,
  notifyBackendStartPolling,
  request,
  handler: exports.handler
};
