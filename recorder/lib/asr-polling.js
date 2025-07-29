// 🔧 新架构：ASR轮询服务
require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

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

// 🎯 提取说话人信息
function extractSpeakerInfo(utterances) {
  if (!utterances || utterances.length === 0) {
    return {
      speaker_count: 0,
      speakers: [],
      summary: '未检测到说话人信息'
    };
  }
  
  // 统计说话人
  const speakerStats = {};
  const speakerSegments = [];
  
  utterances.forEach((utterance, index) => {
    const speaker = utterance.additions?.speaker || 'unknown';
    const startTime = utterance.start_time || 0;
    const endTime = utterance.end_time || 0;
    const duration = endTime - startTime;
    const text = utterance.text || '';
    
    // 统计说话人时长和片段数
    if (!speakerStats[speaker]) {
      speakerStats[speaker] = {
        id: speaker,
        total_duration: 0,
        segment_count: 0,
        words_count: 0,
        first_appear: startTime,
        last_appear: endTime
      };
    }
    
    speakerStats[speaker].total_duration += duration;
    speakerStats[speaker].segment_count += 1;
    speakerStats[speaker].words_count += text.length;
    speakerStats[speaker].last_appear = endTime;
    
    // 记录每个说话片段
    speakerSegments.push({
      index: index,
      speaker: speaker,
      start_time: startTime,
      end_time: endTime,
      duration: duration,
      text: text,
      text_length: text.length
    });
  });
  
  // 转换为数组并排序（按首次出现时间）
  const speakers = Object.values(speakerStats).sort((a, b) => a.first_appear - b.first_appear);
  
  // 生成摘要
  const speakerCount = speakers.length;
  let summary = '';
  
  if (speakerCount === 0) {
    summary = '未检测到说话人';
  } else if (speakerCount === 1) {
    summary = '检测到1个说话人';
  } else {
    const totalDuration = speakers.reduce((sum, s) => sum + s.total_duration, 0);
    const mainSpeaker = speakers.reduce((max, s) => s.total_duration > max.total_duration ? s : max);
    summary = `检测到${speakerCount}个说话人，主要说话人: ${mainSpeaker.id} (${Math.round(mainSpeaker.total_duration/totalDuration*100)}%时长)`;
  }
  
  return {
    speaker_count: speakerCount,
    speakers: speakers,
    segments: speakerSegments,
    summary: summary,
    analysis: {
      total_segments: utterances.length,
      speakers_detected: speakerCount,
      main_speaker: speakers.length > 0 ? speakers[0].id : null
    }
  };
}

// 保存完整ASR响应到调试文件
function saveAsrResponseToDebugFile(recordingId, requestId, fullResponse) {
  try {
    // 使用时间戳和随机数生成唯一文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = Math.random().toString(36).substring(2, 8);
    const debugFileName = `asr_response_${timestamp}_${randomId}.json`;
    const debugFilePath = path.join(__dirname, '..', 'debug', debugFileName);
    
    // 创建调试记录
    const debugRecord = {
      timestamp: new Date().toISOString(),
      recording_id: recordingId,
      request_id: requestId,
      full_response: fullResponse,
      response_size: JSON.stringify(fullResponse).length,
      file_name: debugFileName
    };
    
    // 直接写入新文件，避免并发冲突
    fs.writeFileSync(debugFilePath, JSON.stringify(debugRecord, null, 2), 'utf8');
    console.log(`🐛 完整ASR响应已保存到调试文件: ${debugFilePath}`);
    
    // 异步清理旧的调试文件（保留最近20个文件）
    setTimeout(() => {
      try {
        const debugDir = path.join(__dirname, '..', 'debug');
        const files = fs.readdirSync(debugDir)
          .filter(file => file.startsWith('asr_response_') && file.endsWith('.json'))
          .map(file => ({
            name: file,
            path: path.join(debugDir, file),
            mtime: fs.statSync(path.join(debugDir, file)).mtime
          }))
          .sort((a, b) => b.mtime - a.mtime); // 按修改时间降序排列
        
        // 删除超过20个的旧文件
        if (files.length > 20) {
          const filesToDelete = files.slice(20);
          filesToDelete.forEach(file => {
            try {
              fs.unlinkSync(file.path);
              console.log(`🗑️ 已清理旧调试文件: ${file.name}`);
            } catch (deleteError) {
              console.warn(`⚠️ 清理调试文件失败: ${file.name}`, deleteError.message);
            }
          });
        }
      } catch (cleanupError) {
        console.warn('⚠️ 清理旧调试文件时出错:', cleanupError.message);
      }
    }, 1000); // 1秒后执行清理
    
  } catch (error) {
    console.error('❌ 保存ASR响应调试文件失败:', error);
  }
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
      
      // 无论成功还是失败，都保存完整响应用于调试
      saveAsrResponseToDebugFile(recordingId, requestId, result);
      
      if (result.statusCode === '20000000') {
        // 成功获取结果
        clearInterval(pollInterval);
        console.log(`🎉 ASR转录完成! recordingId: ${recordingId}`);
        
        // 提取说话人信息
        const utterances = result.data.result?.utterances || [];
        const speakerInfo = extractSpeakerInfo(utterances);
        
        const transcriptionData = {
          text: result.data.result?.text || '',
          utterances: utterances,
          audio_info: result.data.audio_info || {},
          speaker_info: speakerInfo,  // 🎯 新增：说话人信息
          completed_at: new Date().toISOString(),
          source: 'polling',
          request_id: requestId,
          poll_count: pollCount,
          total_time: Math.floor(elapsed/1000)
        };
        
        console.log(`📝 转录文本预览: ${transcriptionData.text.substring(0, 100)}...`);
        console.log(`🎤 检测到 ${speakerInfo.speaker_count} 个说话人`);
        
        // 更新数据库 - 根据recording_id匹配记录，包含说话人信息
        db.run(
          `UPDATE recordings SET transcription = ?, status = ?, speaker_count = ?, speaker_info = ? WHERE recording_id = ?`,
          [
            JSON.stringify(transcriptionData), 
            'completed', 
            speakerInfo.speaker_count,
            JSON.stringify(speakerInfo),
            recordingId
          ],
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
  extractSpeakerInfo,  // 🎯 新增：导出说话人信息提取函数
  ASR_CONFIG
};
