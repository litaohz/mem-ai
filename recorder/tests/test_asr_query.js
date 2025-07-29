// 火山引擎ASR查询接口测试
const https = require('https');
const { v4: uuidv4 } = require('uuid');

// 配置信息
const ASR_CONFIG = {
  appKey: process.env.APP_KEY || '7751295260',
  accessKey: process.env.ACCESSKEY || 'xK79OY0Vc8a1NnCo2XPuAEq1EUxDyGBc',
  queryUrl: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/query',
  resourceId: 'volc.bigasr.auc'
};

// 发送HTTP请求的通用函数
function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      const chunks = [];
      let totalLength = 0;
      
      res.on('data', chunk => {
        chunks.push(chunk);
        totalLength += chunk.length;
      });
      
      res.on('end', () => {
        const buffer = Buffer.concat(chunks, totalLength);
        const data = buffer.toString('utf8');
        
        // 解析火山引擎ASR响应
        const result = {
          statusCode: res.headers['x-api-status-code'],
          message: res.headers['x-api-message'],
          logid: res.headers['x-tt-logid'],
          data: data ? JSON.parse(data) : {},
          httpStatus: res.statusCode
        };
        resolve(result);
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

// 查询ASR任务结果
async function queryAsrResult(requestId) {
  console.log(`🔍 查询ASR任务结果...`);
  console.log(`🆔 Request ID: ${requestId}`);
  
  const postData = JSON.stringify({});
  
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Api-App-Key': ASR_CONFIG.appKey,
    'X-Api-Access-Key': ASR_CONFIG.accessKey,
    'X-Api-Resource-Id': ASR_CONFIG.resourceId,
    'X-Api-Request-Id': requestId,
    'Content-Length': Buffer.byteLength(postData, 'utf8'),
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8'
  };
  
  const options = {
    hostname: 'openspeech.bytedance.com',
    path: '/api/v3/auc/bigmodel/query',
    method: 'POST',
    headers
  };
  
  try {
    const result = await makeHttpRequest(options, postData);
    
    console.log('\n📊 查询结果:');
    console.log('HTTP状态:', result.httpStatus);
    console.log('API状态码:', result.statusCode);
    console.log('API消息:', result.message);
    console.log('Log ID:', result.logid);
    
    // 解析不同的状态码
    switch (result.statusCode) {
      case '20000000':
        console.log('✅ 任务处理成功');
        if (result.data.result) {
          console.log('\n📝 转录结果:');
          console.log('文本:', result.data.result.text);
          console.log('分句数量:', result.data.result.utterances?.length || 0);
          if (result.data.audio_info) {
            console.log('音频时长:', Math.floor(result.data.audio_info.duration / 1000), '秒');
          }
          
          // 返回结果用于进一步处理
          return {
            success: true,
            text: result.data.result.text,
            utterances: result.data.result.utterances,
            audio_info: result.data.audio_info
          };
        } else {
          console.log('⚠️ 成功但无转录数据');
          return { success: true, text: null };
        }
        
      case '20000001':
        console.log('⏳ 任务正在处理中...');
        return { success: false, status: 'processing' };
        
      case '20000002':
        console.log('⏳ 任务在队列中等待...');
        return { success: false, status: 'queued' };
        
      case '20000003':
        console.log('⚠️ 静音音频');
        return { success: false, status: 'silent_audio' };
        
      case '45000001':
        console.log('❌ 请求参数无效');
        return { success: false, status: 'invalid_params' };
        
      case '45000002':
        console.log('❌ 空音频');
        return { success: false, status: 'empty_audio' };
        
      case '45000151':
        console.log('❌ 音频格式不正确');
        return { success: false, status: 'invalid_format' };
        
      default:
        if (result.statusCode?.startsWith('550')) {
          console.log('❌ 服务内部处理错误');
          return { success: false, status: 'server_error' };
        } else if (result.statusCode === '55000031') {
          console.log('❌ 服务器繁忙');
          return { success: false, status: 'server_busy' };
        } else {
          console.log('❌ 未知错误:', result.statusCode, result.message);
          return { success: false, status: 'unknown_error' };
        }
    }
    
  } catch (error) {
    console.error('❌ 查询请求失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 轮询查询ASR结果（带重试）
async function pollAsrResult(requestId, maxRetries = 30, interval = 10000) {
  console.log(`🔄 开始轮询ASR结果...`);
  console.log(`📋 最大重试次数: ${maxRetries}`);
  console.log(`⏱️ 查询间隔: ${interval/1000}秒`);
  console.log('=' * 50);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n🔍 第 ${attempt}/${maxRetries} 次查询...`);
    
    const result = await queryAsrResult(requestId);
    
    if (result.success) {
      console.log('\n🎉 ASR处理完成！');
      return result;
    }
    
    if (result.status === 'processing' || result.status === 'queued') {
      console.log(`⏳ 继续等待... (${interval/1000}秒后重试)`);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    } else {
      console.log(`❌ ASR处理失败: ${result.status}`);
      return result;
    }
  }
  
  console.log('⏰ 轮询超时，任务可能仍在处理中');
  return { success: false, status: 'timeout' };
}

// 测试已知的Request ID
async function testKnownRequestId() {
  console.log('🧪 测试已知的Request ID');
  console.log('=' * 50);
  
  // 使用之前提交的Request ID
  const knownRequestId = 'a4b1e969-097c-4b0b-9c32-6e9eec7d9fe5';
  
  console.log(`🆔 测试Request ID: ${knownRequestId}`);
  console.log(`⏰ 提交时间: 2025-07-28 14:42:25 (约${Math.floor((Date.now() - new Date('2025-07-28T14:42:25').getTime()) / 1000 / 3600)}小时前)`);
  
  const result = await queryAsrResult(knownRequestId);
  
  if (result.success && result.text) {
    console.log('\n🎉 成功获取转录结果！');
    console.log('📝 这证明query接口工作正常');
    
    // 可以选择将结果发送到后端
    console.log('\n💡 可以将此结果发送到后端更新数据库');
    return result;
  } else {
    console.log('\n🤔 结果分析:');
    console.log(`状态: ${result.status || result.error}`);
    console.log('这可能说明:');
    console.log('1. 任务确实失败了');
    console.log('2. Request ID不正确');
    console.log('3. 任务已过期（火山引擎可能有时效限制）');
  }
  
  return result;
}

// 主测试函数
async function runQueryTest() {
  console.log('🔧 火山引擎ASR查询接口测试');
  console.log(`📅 测试时间: ${new Date().toISOString()}`);
  console.log('=' * 50);
  
  // 验证配置
  console.log('🔑 API配置:');
  console.log(`App Key: ${ASR_CONFIG.appKey}`);
  console.log(`Access Key: ${ASR_CONFIG.accessKey.substring(0, 8)}...`);
  console.log(`Query URL: ${ASR_CONFIG.queryUrl}`);
  
  try {
    // 测试已知的Request ID
    await testKnownRequestId();
    
    console.log('\n💡 使用建议:');
    console.log('1. 如果查询成功，可以考虑用query模式替代callback');
    console.log('2. 在云函数中提交任务后，启动定时查询');
    console.log('3. 查询成功后直接调用后端接口更新数据库');
    console.log('4. 这样避免了callback网络问题');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 导出函数用于其他脚本
module.exports = {
  queryAsrResult,
  pollAsrResult,
  testKnownRequestId,
  runQueryTest
};

// 如果直接运行此文件
if (require.main === module) {
  runQueryTest().catch(console.error);
}
