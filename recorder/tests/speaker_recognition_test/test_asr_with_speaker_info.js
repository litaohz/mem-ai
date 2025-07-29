// 🎯 测试ASR说话人识别功能
const fs = require('fs');
const path = require('path');
const https = require('https');
const { extractSpeakerInfo } = require('../../lib/asr-polling');

// 确保环境变量已设置 - 从项目根目录加载
const envPath = path.join(__dirname, '..', '..', '.env');
require('dotenv').config({ path: envPath });

// ASR API配置
const APP_KEY = process.env.APP_KEY;
const ACCESSKEY = process.env.ACCESSKEY;

// 检查环境变量
if (!APP_KEY || !ACCESSKEY) {
  console.error('❌ 环境变量未设置，请确保以下环境变量已配置：');
  console.error('  - APP_KEY: 火山引擎应用密钥');
  console.error('  - ACCESSKEY: 火山引擎访问密钥');
  console.error('\n请创建.env文件或设置环境变量后重试');
  process.exit(1);
}

// 测试文件路径
const TEST_AUDIO_FILE = process.argv[2] || '1753784804508-12235786.webm';
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const AUDIO_FILE_PATH = path.join(UPLOADS_DIR, TEST_AUDIO_FILE);

// 检查测试文件是否存在
if (!fs.existsSync(AUDIO_FILE_PATH)) {
  console.error(`❌ 测试文件不存在: ${AUDIO_FILE_PATH}`);
  console.error('请提供正确的音频文件路径作为参数');
  console.error('示例: node test_asr_with_speaker_info.js 1753784804508-12235786.webm');
  process.exit(1);
}

// 获取文件信息
const fileStats = fs.statSync(AUDIO_FILE_PATH);
const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);

console.log('🎯 开始测试ASR说话人识别功能');
console.log('='.repeat(50));
console.log(`📁 测试文件: ${TEST_AUDIO_FILE}`);
console.log(`📊 文件大小: ${fileSizeMB} MB`);
console.log(`🔑 使用的APP_KEY: ${APP_KEY.substring(0, 4)}...`);
console.log('='.repeat(50));

// 上传文件到临时URL或使用本地文件路径
async function getAudioFileUrl() {
  // 使用本地文件URL格式，让API能访问本地测试文件
  return `file://${path.resolve(AUDIO_FILE_PATH)}`;
}

// ASR请求函数
async function makeAsrRequest(method, path, body = {}, requestId = null) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Api-App-Key': APP_KEY,
      'X-Api-Access-Key': ACCESSKEY,
      'X-Api-Resource-Id': 'volc.bigasr.auc',
      'Content-Length': Buffer.byteLength(postData, 'utf8'),
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8'
    };
    
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
        
        console.log('📥 响应状态:', res.statusCode);
        console.log('📥 响应头:', res.headers);
        console.log('📥 响应数据:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
        
        let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      parsedData = {};
    }
    
    const result = {
      statusCode: res.headers['x-api-status-code'] || (parsedData.header && parsedData.header.code) || parsedData.status_code || parsedData.statusCode,
      message: res.headers['x-api-message'] || (parsedData.header && parsedData.header.message) || parsedData.message || parsedData.msg,
      logid: res.headers['x-tt-logid'] || (parsedData.header && parsedData.header.reqid) || parsedData.logid,
      data: parsedData
    };
        resolve(result);
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// 主测试函数
async function testAsrWithSpeakerInfo() {
  try {
    console.log('\n🔍 准备测试音频文件...');
    const audioFileName = path.basename(AUDIO_FILE_PATH);
    
    // 使用真实的TOS云存储URL
    const audioFileUrl = `https://bucket-bj-0720.tos-cn-beijing.volces.com/recordings/2025/07/4/${audioFileName}`;
    
    console.log(`✅ 使用真实TOS云存储URL`);
    console.log(`✅ 音频文件就绪: ${audioFileUrl}`);
    
    // 生成唯一请求ID
    const requestId = `test-speaker-${Date.now()}`;
    console.log(`🆔 请求ID: ${requestId}`);
    
    // 读取音频文件
    const audioBuffer = fs.readFileSync(AUDIO_FILE_PATH);
    console.log(`📊 音频文件大小: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
    
    // 提交ASR任务
    console.log('\n📤 提交ASR任务...');
    
    const submitResult = await makeAsrRequest('POST', '/api/v3/auc/bigmodel/submit', {
      audio: {
        format: 'webm',
        url: audioFileUrl,
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
    
    console.log('\n📋 ASR任务提交结果:');
    console.log(`  状态码: ${submitResult.statusCode}`);
    console.log(`  消息: ${submitResult.message}`);
    console.log(`  日志ID: ${submitResult.logid}`);
    
    if (submitResult.statusCode !== '20000000') {
      console.error(`❌ ASR任务提交失败: ${submitResult.message}`);
      return;
    }
    
    console.log('\n✅ ASR任务提交成功，开始轮询结果...');
    
    // 轮询ASR结果
    let completed = false;
    let pollCount = 0;
    const maxPolls = 30; // 最多轮询30次
    const pollInterval = 5000; // 每5秒轮询一次
    
    while (!completed && pollCount < maxPolls) {
      pollCount++;
      console.log(`\n🔄 轮询 #${pollCount}...`);
      
      const queryResult = await makeAsrRequest('POST', '/api/v3/auc/bigmodel/query', {
        request: { id: requestId }
      }, requestId);
      
      console.log(`  状态码: ${queryResult.statusCode}`);
      console.log(`  消息: ${queryResult.message}`);
      
      if (queryResult.statusCode === '20000000') {
        // 成功获取结果
        completed = true;
        console.log('\n🎉 ASR转录完成!');
        
        // 保存完整响应用于调试
        const debugFilePath = path.join(__dirname, 'asr_response_debug.json');
        fs.writeFileSync(debugFilePath, JSON.stringify(queryResult, null, 2), 'utf8');
        console.log(`📝 完整响应已保存到: ${debugFilePath}`);
        
        // 提取并分析结果
        const utterances = queryResult.data.result?.utterances || [];
        const fullText = queryResult.data.result?.text || '';
        
        console.log('\n📝 转录文本:');
        console.log('-'.repeat(50));
        console.log(fullText);
        console.log('-'.repeat(50));
        
        // 提取说话人信息
        const speakerInfo = extractSpeakerInfo(utterances);
        
        console.log('\n🎤 说话人识别结果:');
        console.log(`  检测到说话人数量: ${speakerInfo.speaker_count}`);
        console.log(`  摘要: ${speakerInfo.summary}`);
        
        if (speakerInfo.speaker_count > 0) {
          console.log('\n👥 说话人详细信息:');
          speakerInfo.speakers.forEach((speaker, index) => {
            const durationSec = Math.floor(speaker.total_duration / 1000);
            console.log(`  ${index + 1}. 说话人${speaker.id}:`);
            console.log(`     - 发言时长: ${durationSec}秒`);
            console.log(`     - 发言片段: ${speaker.segment_count}个`);
            console.log(`     - 文字数量: ${speaker.words_count}字`);
            console.log(`     - 首次出现: ${speaker.first_appear}ms`);
            console.log(`     - 最后出现: ${speaker.last_appear}ms`);
            console.log('');
          });
          
          console.log('\n🎭 对话流程:');
          speakerInfo.segments.forEach((segment, index) => {
            const startSec = Math.floor(segment.start_time / 1000);
            const endSec = Math.floor(segment.end_time / 1000);
            console.log(`  ${index + 1}. [${startSec}s-${endSec}s] 说话人${segment.speaker}: ${segment.text}`);
          });
        }
        
        break;
      } else if (queryResult.statusCode === '20000001' || queryResult.statusCode === '20000002') {
        // 还在处理中，继续轮询
        console.log(`  ⏳ ASR处理中... 状态: ${queryResult.message}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        // 处理失败
        console.error(`\n❌ ASR处理失败: ${queryResult.message} (${queryResult.statusCode})`);
        completed = true;
        break;
      }
    }
    
    if (!completed) {
      console.error('\n⏰ 轮询超时，ASR处理可能需要更长时间');
    }
    
  } catch (error) {
    console.error('\n💥 测试过程中出现错误:', error);
  }
}

// 执行测试
testAsrWithSpeakerInfo().then(() => {
  console.log('\n🎯 测试完成!');
}).catch(error => {
  console.error('\n💥 测试执行失败:', error);
});