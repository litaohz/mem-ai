// 🔧 新架构：ASR轮询服务
require('dotenv').config();
const https = require('https');

// ASR配置
const ASR_CONFIG = {
  appKey: process.env.APP_KEY,
  accessKey: process.env.ACCESSKEY,
  submitUrl: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit',
  queryUrl: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/query',
  resourceId: 'volc.bigasr.auc',
  sequence: '-1',
  pollInterval: 10000, // 10秒轮询一次
  maxPollTime: 600000  // 最大轮询10分钟
};

// 生成ASR请求头
function generateAsrHeaders(requestId) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Api-App-Key': ASR_CONFIG.appKey,
    'X-Api-Access-Key': ASR_CONFIG.accessKey,
    'X-Api-Resource-Id': ASR_CONFIG.resourceId,
    'X-Api-Request-Id': requestId,
    'X-Api-Sequence': ASR_CONFIG.sequence,
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8'
  };
}

// 发送HTTPS请求的通用函数
function makeHttpsRequest(url, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      const chunks = [];
      let totalLength = 0;
      
      res.on('data', chunk => {
        chunks.push(chunk);
        totalLength += chunk.length;
      });
      
      res.on('end', () => {
        const buffer = Buffer.concat(chunks, totalLength);
        const data = buffer.toString('utf8');
        
        const result = {
          statusCode: res.headers['x-api-status-code'],
          message: res.headers['x-api-message'],
          logid: res.headers['x-tt-logid'],
          data: data ? JSON.parse(data) : {}
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

// 查询ASR结果
async function queryAsrResult(requestId) {
  try {
    console.log(`🔍 查询ASR结果，Request ID: ${requestId}`);
    
    const headers = generateAsrHeaders(requestId);
    headers['Content-Length'] = '2';
    
    const result = await makeHttpsRequest(ASR_CONFIG.queryUrl, {
      method: 'POST',
      headers: headers
    }, '{}');
    
    console.log(`📥 ASR查询响应:`, {
      statusCode: result.statusCode,
      message: result.message,
      logid: result.logid,
      hasData: !!result.data
    });
    
    return result;
    
  } catch (error) {
    console.error(`❌ 查询ASR结果失败:`, error);
    throw error;
  }
}

// 启动ASR轮询服务
function startAsrPolling(recordingId, requestId, db) {
  console.log(`🔄 开始轮询 recordingId: ${recordingId}, requestId: ${requestId}`);
  
  const startTime = Date.now();
  let pollCount = 0;
  
  const pollInterval = setInterval(async () => {
    pollCount++;
    const elapsed = Date.now() - startTime;
    
    console.log(`⏱️ 轮询 #${pollCount} - 已用时: ${Math.floor(elapsed/1000)}秒`);
    
    // 检查是否超时
    if (elapsed > ASR_CONFIG.maxPollTime) {
      clearInterval(pollInterval);
      console.log(`⏰ 轮询超时，停止轮询 recordingId: ${recordingId}`);
      
      // 更新状态为超时
      db.run(
        `UPDATE recordings SET status = ? WHERE recording_id = ?`,
        ['timeout', recordingId],
        (err) => {
          if (err) {
            console.error('❌ 更新超时状态失败:', err);
          } else {
            console.log(`⏰ 录音 ${recordingId} 标记为超时`);
          }
        }
      );
      return;
    }
    
    try {
      const result = await queryAsrResult(requestId);
      
      if (result.statusCode === '20000000') {
        // 成功获取结果
        clearInterval(pollInterval);
        console.log(`🎉 ASR转录完成! recordingId: ${recordingId}`);
        
        const transcriptionData = {
          text: result.data.result?.text || '',
          utterances: result.data.result?.utterances || [],
          audio_info: result.data.audio_info || {},
          completed_at: new Date().toISOString(),
          source: 'polling',
          request_id: requestId,
          poll_count: pollCount,
          total_time: Math.floor(elapsed/1000)
        };
        
        console.log(`📝 转录文本预览: ${transcriptionData.text.substring(0, 100)}...`);
        
        // 更新数据库 - 根据recording_id匹配记录
        db.run(
          `UPDATE recordings SET transcription = ?, status = ? WHERE recording_id = ?`,
          [JSON.stringify(transcriptionData), 'completed', recordingId],
          function(err) {
            if (err) {
              console.error('❌ 更新转录结果失败:', err);
            } else {
              console.log(`✅ 录音 ${recordingId} 转录完成并保存到数据库 (影响行数: ${this.changes})`);
            }
          }
        );
        
      } else if (result.statusCode === '20000001' || result.statusCode === '20000002') {
        // 还在处理中或在队列中，继续轮询
        console.log(`⏳ ASR处理中... 状态: ${result.message}`);
        
      } else {
        // 处理失败
        clearInterval(pollInterval);
        console.log(`❌ ASR处理失败: ${result.message} (${result.statusCode})`);
        
        // 更新状态为失败
        db.run(
          `UPDATE recordings SET status = ?, transcription = ? WHERE recording_id = ?`,
          ['failed', `ASR处理失败: ${result.message}`, recordingId],
          (err) => {
            if (err) {
              console.error('❌ 更新失败状态错误:', err);
            } else {
              console.log(`❌ 录音 ${recordingId} 标记为失败`);
            }
          }
        );
      }
      
    } catch (error) {
      console.error(`❌ 轮询过程中出错:`, error);
      // 继续轮询，不因为单次错误而停止
    }
    
  }, ASR_CONFIG.pollInterval);
  
  console.log(`✅ 轮询服务已启动，每${ASR_CONFIG.pollInterval/1000}秒查询一次`);
}

module.exports = {
  startAsrPolling,
  queryAsrResult,
  ASR_CONFIG
};
