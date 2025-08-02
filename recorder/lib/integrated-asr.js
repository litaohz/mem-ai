// 🎯 集成ASR处理模块 - 支持分包和会话管理
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');
const { uploadFileToTos } = require('../config/tos-config');
const { mapSpeakerConsistency, generateMappingReport } = require('./speaker-consistency');

const execAsync = promisify(exec);

// ASR配置
const ASR_CONFIG = {
  appKey: process.env.APP_KEY || '7751295260',
  accessKey: process.env.ACCESSKEY || 'xK79OY0Vc8a1NnCo2XPuAEq1EUxDyGBc',
  submitUrl: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit',
  queryUrl: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/query',
  resourceId: 'volc.bigasr.auc',
  sequence: '-1'
};

// 分包配置
const CHUNK_CONFIG = {
  TARGET_DURATION_SECONDS: 60, // 1分钟分包
  MAX_CHUNKS: 20,
  CHUNK_DIR: path.join(__dirname, '../chunks')
};

/**
 * 生成请求头
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
 * 获取音频文件信息
 */
async function getAudioInfo(filePath) {
  try {
    const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
    const info = JSON.parse(stdout);
    
    const audioStream = info.streams.find(s => s.codec_type === 'audio');
    
    // 尝试从不同地方获取时长
    let duration = parseFloat(info.format.duration);
    if (isNaN(duration) && audioStream && audioStream.duration) {
      duration = parseFloat(audioStream.duration);
    }
    
    // 如果还是获取不到，使用文件大小和比特率估算
    if (isNaN(duration)) {
      const size = parseInt(info.format.size);
      const bitrate = parseInt(info.format.bit_rate) || parseInt(audioStream?.bit_rate) || 128000;
      duration = (size * 8) / bitrate;
    }
    
    const size = parseInt(info.format.size);
    const bitrate = parseInt(info.format.bit_rate) || parseInt(audioStream?.bit_rate) || 0;
    
    return {
      duration: duration || 0,
      size,
      sizeKB: (size / 1024).toFixed(2),
      sizeMB: (size / 1024 / 1024).toFixed(2),
      bitrate,
      audioCodec: audioStream?.codec_name || 'unknown',
      sampleRate: audioStream?.sample_rate || 0
    };
  } catch (error) {
    throw new Error(`获取音频信息失败: ${error.message}`);
  }
}

/**
 * 计算分包时间段（基于固定时长）
 */
function calculateChunkDurations(totalDuration, targetDurationSeconds) {
  const totalChunks = Math.ceil(totalDuration / targetDurationSeconds);
  
  const chunks = [];
  for (let i = 0; i < totalChunks; i++) {
    const startTime = i * targetDurationSeconds;
    const endTime = Math.min((i + 1) * targetDurationSeconds, totalDuration);
    const actualDuration = endTime - startTime;
    
    chunks.push({
      index: i + 1,
      startTime: startTime.toFixed(2),
      endTime: endTime.toFixed(2),
      duration: actualDuration.toFixed(2),
      fileName: `chunk_${String(i + 1).padStart(3, '0')}.webm`
    });
  }
  
  return chunks;
}

/**
 * 使用FFmpeg切割音频
 */
async function cutAudioChunk(inputFile, outputFile, startTime, duration) {
  const command = `ffmpeg -i "${inputFile}" -ss ${startTime} -t ${duration} -c copy -avoid_negative_ts make_zero "${outputFile}" -y`;
  
  try {
    await execAsync(command);
    return true;
  } catch (error) {
    console.error(`切割失败: ${error.message}`);
    return false;
  }
}

/**
 * 分包音频文件
 */
async function chunkAudioFile(inputFile, recordingId) {
  console.log(`🎵 开始分包音频文件: ${inputFile}`);
  
  // 创建分包目录
  const chunkDir = path.join(CHUNK_CONFIG.CHUNK_DIR, recordingId.toString());
  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }
  
  // 获取音频信息
  const audioInfo = await getAudioInfo(inputFile);
  console.log(`📊 音频信息: ${audioInfo.duration}s, ${audioInfo.sizeKB}KB`);
  
  // 检查是否需要分包（基于时长）
  if (audioInfo.duration <= CHUNK_CONFIG.TARGET_DURATION_SECONDS) {
    console.log(`📦 文件时长${audioInfo.duration}s，小于${CHUNK_CONFIG.TARGET_DURATION_SECONDS}s，无需分包`);
    return [{
      index: 1,
      fileName: path.basename(inputFile),
      filePath: inputFile,
      actualSizeKB: audioInfo.sizeKB,
      duration: audioInfo.duration.toFixed(2),
      success: true
    }];
  }
  
  // 计算分包时间段（基于固定时长）
  const chunks = calculateChunkDurations(
    audioInfo.duration,
    CHUNK_CONFIG.TARGET_DURATION_SECONDS
  );
  
  console.log(`📦 将分成 ${chunks.length} 个包`);
  
  // 执行分包
  const results = [];
  for (const chunk of chunks) {
    const outputPath = path.join(chunkDir, chunk.fileName);
    
    console.log(`🔪 切割分包 ${chunk.index}: ${chunk.startTime}s-${chunk.endTime}s`);
    
    const success = await cutAudioChunk(
      inputFile,
      outputPath,
      chunk.startTime,
      chunk.duration
    );
    
    if (success && fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      results.push({
        ...chunk,
        filePath: outputPath,
        actualSizeKB: sizeKB,
        success: true
      });
      
      console.log(`✅ 分包 ${chunk.index} 成功: ${sizeKB}KB`);
    } else {
      console.log(`❌ 分包 ${chunk.index} 失败`);
      results.push({
        ...chunk,
        success: false
      });
    }
  }
  
  return results;
}

/**
 * 上传分包到TOS
 */
async function uploadChunksToTos(chunks, recordingId) {
  console.log(`🌊 开始上传 ${chunks.length} 个分包到TOS`);
  
  const uploadResults = [];
  for (const chunk of chunks) {
    if (!chunk.success) {
      uploadResults.push({ ...chunk, tosUpload: false });
      continue;
    }
    
    try {
      const uploadResult = await uploadFileToTos(
        chunk.filePath,
        chunk.fileName,
        recordingId,
        `uploads/chunks/${recordingId}`
      );
      
      if (uploadResult.success) {
        console.log(`✅ 分包 ${chunk.index} 上传成功: ${uploadResult.fileUrl}`);
        uploadResults.push({
          ...chunk,
          tosUpload: true,
          tosUrl: uploadResult.fileUrl,
          tosKey: uploadResult.objectKey
        });
      } else {
        console.log(`❌ 分包 ${chunk.index} 上传失败`);
        uploadResults.push({ ...chunk, tosUpload: false });
      }
    } catch (error) {
      console.error(`❌ 分包 ${chunk.index} 上传异常:`, error.message);
      uploadResults.push({ ...chunk, tosUpload: false });
    }
  }
  
  return uploadResults;
}

/**
 * 提交单个分包ASR任务
 */
async function submitChunkAsr(chunk, sessionId, totalChunks) {
  const requestId = uuidv4();
  
  const requestBody = {
    user: {
      uid: `user_${Date.now()}`
    },
    audio: {
      format: "webm",
      url: chunk.tosUrl,
      codec: "opus",
      rate: 16000,
      bits: 16,
      channel: 1
    },
    request: {
      model_name: "bigmodel",
      enable_itn: true,
      enable_punc: true,
      enable_ddc: true,
      enable_speaker_info: true,
      show_utterances: true,
      
      // 会话模式参数
      session_id: sessionId,
      chunk_index: chunk.index - 1, // 从0开始
      is_final: chunk.index === totalChunks
    }
  };

  console.log(`🎙️ 提交分包 ${chunk.index}/${totalChunks} ASR任务`);

  try {
    const response = await axios.post(ASR_CONFIG.submitUrl, requestBody, {
      headers: generateHeaders(requestId),
      timeout: 30000
    });

    const statusCode = response.headers['x-api-status-code'];
    const message = response.headers['x-api-message'];

    if (statusCode === '20000000') {
      console.log(`✅ 分包 ${chunk.index} ASR提交成功`);
      return { 
        success: true, 
        requestId, 
        chunkIndex: chunk.index,
        sessionId 
      };
    } else {
      console.log(`❌ 分包 ${chunk.index} ASR提交失败: ${message}`);
      return { 
        success: false, 
        chunkIndex: chunk.index, 
        message 
      };
    }

  } catch (error) {
    console.log(`❌ 分包 ${chunk.index} ASR提交异常: ${error.message}`);
    return { 
      success: false, 
      chunkIndex: chunk.index, 
      error: error.message 
    };
  }
}

/**
 * 查询ASR结果
 */
async function queryAsrResult(requestId, chunkIndex) {
  try {
    const response = await axios.post(ASR_CONFIG.queryUrl, {}, {
      headers: generateHeaders(requestId),
      timeout: 30000
    });

    const statusCode = response.headers['x-api-status-code'];
    const message = response.headers['x-api-message'];

    switch (statusCode) {
      case '20000000':
        console.log(`✅ 分包 ${chunkIndex} ASR完成`);
        return { success: true, data: response.data, chunkIndex };
      case '20000001':
        return { success: false, processing: true, chunkIndex };
      case '20000002':
        return { success: false, queued: true, chunkIndex };
      case '20000003':
        console.log(`🔇 分包 ${chunkIndex} 为静音音频，跳过`);
        // 静音音频视为成功，但返回空结果
        return { 
          success: true, 
          data: { 
            result: { text: '', utterances: [] },
            audio_info: response.data?.audio_info || {}
          }, 
          chunkIndex,
          isSilent: true 
        };
      default:
        console.log(`❌ 分包 ${chunkIndex} ASR失败: ${message} (状态码: ${statusCode})`);
        return { success: false, chunkIndex, message, statusCode };
    }

  } catch (error) {
    console.log(`❌ 分包 ${chunkIndex} ASR查询异常: ${error.message}`);
    return { success: false, chunkIndex, error: error.message };
  }
}

/**
 * 轮询单个分包结果
 */
async function pollChunkResult(requestId, chunkIndex, maxAttempts = 20) {
  console.log(`🔄 开始轮询分包 ${chunkIndex} ASR结果...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await queryAsrResult(requestId, chunkIndex);
    
    if (result.success) {
      return result;
    }
    
    if (result.processing || result.queued) {
      console.log(`⏳ 分包 ${chunkIndex} 处理中... (${attempt}/${maxAttempts})`);
      // 增加轮询间隔到5秒，降低QPS
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }
    
    return result;
  }
  
  return { success: false, timeout: true, chunkIndex };
}

/**
 * 合并ASR结果
 */
function mergeAsrResults(results, chunks = []) {
  const successResults = results.filter(r => r.success);
  const silentResults = successResults.filter(r => r.isSilent);
  const validResults = successResults.filter(r => !r.isSilent);
  
  if (successResults.length === 0) {
    return {
      text: '',
      utterances: [],
      speakers: [],
      summary: '无有效转写结果'
    };
  }
  
  // 按分包顺序排序
  validResults.sort((a, b) => a.chunkIndex - b.chunkIndex);
  
  console.log('\n🔄 开始合并ASR结果并应用说话人一致性映射...');
  
  // 1. 准备分包数据用于说话人映射
  const chunkResultsForMapping = validResults.map(result => {
    // 计算当前分包的时间偏移
    const chunkIndex = result.chunkIndex;
    let timeOffset = 0;
    
    // 如果有分包信息，计算时间偏移
    if (chunks && chunks.length > 0) {
      const chunk = chunks.find(c => c.index === chunkIndex);
      if (chunk) {
        timeOffset = parseFloat(chunk.startTime) || 0;
      }
    }
    
    return {
      success: result.success,
      timeOffset: timeOffset,
      data: result.data
    };
  });
  
  // 2. 应用基于规则的说话人一致性映射
  const mappingResult = mapSpeakerConsistency(chunkResultsForMapping);
  
  // 3. 使用映射后的utterances
  const mappedUtterances = mappingResult.mappedUtterances || [];
  
  // 4. 合并文本
  let fullText = '';
  validResults.forEach((result, index) => {
    const text = result.data?.result?.text || '';
    if (text) {
      fullText += (index > 0 ? ' ' : '') + text;
    }
  });
  
  // 5. 生成详细的处理摘要
  const totalChunks = results.length;
  const failedChunks = results.filter(r => !r.success).length;
  const globalSpeakers = mappingResult.globalSpeakers || [];
  
  let summary = `总计 ${totalChunks} 个分包: `;
  summary += `${validResults.length} 个有效, `;
  summary += `${silentResults.length} 个静音`;
  if (failedChunks > 0) {
    summary += `, ${failedChunks} 个失败`;
  }
  summary += `，应用规则映射后识别到 ${globalSpeakers.length} 个说话人`;
  
  // 6. 生成分包结果统计（包含原始和映射后的说话人信息）
  const chunkResults = successResults.map(r => {
    const originalSpeakers = (r.data?.result?.utterances || [])
      .map(u => u.additions?.speaker)
      .filter(s => s)
      .filter((s, i, arr) => arr.indexOf(s) === i);
    
    return {
      chunkIndex: r.chunkIndex,
      text: r.data?.result?.text || '',
      isSilent: r.isSilent || false,
      originalSpeakers: originalSpeakers,
      speakerCount: originalSpeakers.length
    };
  });
  
  console.log(`✅ 合并完成: ${mappedUtterances.length} 个utterances, ${globalSpeakers.length} 个全局说话人`);
  
  return {
    text: fullText,
    utterances: mappedUtterances,
    speakers: globalSpeakers,
    speakerCount: globalSpeakers.length,
    chunkResults: chunkResults,
    speakerMapping: {
      mapping: mappingResult.mapping || {},
      rules: mappingResult.rules || [],
      statistics: mappingResult.statistics || {}
    },
    statistics: {
      totalChunks,
      validChunks: validResults.length,
      silentChunks: silentResults.length,
      failedChunks
    },
    summary
  };
}

/**
 * 主处理函数 - 完整的分包ASR流程
 */
async function processAudioWithChunking(inputFile, recordingId, db) {
  console.log(`🚀 开始处理音频文件: ${inputFile}`);
  
  try {
    // 1. 分包音频文件
    const chunks = await chunkAudioFile(inputFile, recordingId);
    const successChunks = chunks.filter(c => c.success);
    
    if (successChunks.length === 0) {
      throw new Error('所有分包都失败了');
    }
    
    console.log(`📦 成功创建 ${successChunks.length}/${chunks.length} 个分包`);
    
    // 2. 上传分包到TOS
    const uploadedChunks = await uploadChunksToTos(successChunks, recordingId);
    const validChunks = uploadedChunks.filter(c => c.tosUpload);
    
    if (validChunks.length === 0) {
      throw new Error('所有分包上传都失败了');
    }
    
    console.log(`🌊 成功上传 ${validChunks.length}/${uploadedChunks.length} 个分包`);
    
    // 3. 生成会话ID并提交ASR任务
    const sessionId = uuidv4();
    console.log(`🆔 会话ID: ${sessionId}`);
    
    // 更新数据库状态
    db.run(
      `UPDATE recordings SET session_id = ?, status = ?, total_chunks = ? WHERE id = ?`,
      [sessionId, 'processing', validChunks.length, recordingId]
    );
    
    const submitResults = [];
    for (const chunk of validChunks) {
      const result = await submitChunkAsr(chunk, sessionId, validChunks.length);
      submitResults.push(result);
      
      // 分包间隔2秒，避免QPS过高
      if (chunk.index < validChunks.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const successSubmits = submitResults.filter(r => r.success);
    console.log(`📤 成功提交 ${successSubmits.length}/${submitResults.length} 个ASR任务`);
    
    if (successSubmits.length === 0) {
      throw new Error('所有ASR任务提交都失败了');
    }
    
    // 4. 等待并轮询结果 (添加限流控制)
    console.log('⏳ 等待5秒后开始轮询...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const pollResults = [];
    for (let i = 0; i < successSubmits.length; i++) {
      const submit = successSubmits[i];
      
      // 轮询间隔2秒，避免QPS过高
      if (i > 0) {
        console.log(`⏱️ 等待2秒后轮询下一个分包...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const result = await pollChunkResult(submit.requestId, submit.chunkIndex);
      pollResults.push(result);
    }
    
    // 5. 合并结果
    const mergedResult = mergeAsrResults(pollResults, validChunks);
    
    // 6. 保存到数据库
    db.run(
      `UPDATE recordings SET 
        transcription = ?, 
        speaker_info = ?, 
        speaker_count = ?, 
        status = ?,
        completed_at = datetime('now')
      WHERE id = ?`,
      [
        JSON.stringify({ text: mergedResult.text, utterances: mergedResult.utterances }),
        JSON.stringify({ 
          speakers: mergedResult.speakers,
          chunkResults: mergedResult.chunkResults,
          speakerMapping: mergedResult.speakerMapping,
          summary: mergedResult.summary
        }),
        mergedResult.speakerCount,
        'completed',
        recordingId
      ],
      function(err) {
        if (err) {
          console.error('❌ 保存结果到数据库失败:', err);
        } else {
          console.log(`✅ 结果已保存到数据库 (影响行数: ${this.changes})`);
        }
      }
    );
    
    console.log(`🎉 音频处理完成！`);
    console.log(`📝 转写文本: ${mergedResult.text}`);
    console.log(`🎭 说话人: ${mergedResult.speakers.join(', ')}`);
    
    return {
      success: true,
      sessionId,
      chunks: validChunks.length,
      result: mergedResult
    };
    
  } catch (error) {
    console.error('❌ 音频处理失败:', error.message);
    
    // 更新数据库状态为失败
    db.run(
      `UPDATE recordings SET status = ?, error_message = ? WHERE id = ?`,
      ['failed', error.message, recordingId]
    );
    
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processAudioWithChunking,
  chunkAudioFile,
  uploadChunksToTos,
  submitChunkAsr,
  pollChunkResult,
  mergeAsrResults
};