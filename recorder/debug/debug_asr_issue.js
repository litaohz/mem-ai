// ASR回调问题诊断工具
const https = require('https');
const http = require('http');

console.log('🔍 ASR回调问题诊断');
console.log('=' * 50);

// 配置
const NGROK_URL = 'https://223afc8d9014.ngrok-free.app';
const CALLBACK_PATH = '/api/transcription-callback';
const RECORDING_ID = '9f475b12-7099-4f0e-9457-d5299bcbf4bf';

// 1. 测试ngrok连通性
async function testNgrokConnectivity() {
  console.log('\n1️⃣ 测试ngrok连通性...');
  
  const testUrl = `${NGROK_URL}${CALLBACK_PATH}?recordingId=${RECORDING_ID}&source=test`;
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      test: true,
      timestamp: new Date().toISOString()
    });
    
    const url = new URL(testUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'ASR-Callback-Test/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ ngrok连通性测试成功`);
        console.log(`   状态码: ${res.statusCode}`);
        console.log(`   响应: ${data}`);
        resolve(true);
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ngrok连通性测试失败: ${err.message}`);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// 2. 模拟火山引擎ASR回调
async function simulateVolcASRCallback() {
  console.log('\n2️⃣ 模拟火山引擎ASR回调...');
  
  const callbackUrl = `${NGROK_URL}${CALLBACK_PATH}?recordingId=${RECORDING_ID}&source=asr_callback`;
  
  // 模拟真实的ASR回调数据格式
  const asrCallbackData = {
    result: {
      text: "这是模拟的火山引擎ASR回调结果。如果您看到这条消息，说明回调接口工作正常。",
      utterances: [
        {
          text: "这是模拟的火山引擎ASR回调结果。",
          start_time: 0,
          end_time: 2500,
          definite: true
        },
        {
          text: "如果您看到这条消息，说明回调接口工作正常。",
          start_time: 2500,
          end_time: 5000,
          definite: true
        }
      ]
    },
    audio_info: {
      duration: 5000,
      sample_rate: 16000,
      channels: 1
    }
  };
  
  return new Promise((resolve) => {
    const postData = JSON.stringify(asrCallbackData);
    
    const url = new URL(callbackUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'VolcEngine-ASR/1.0',  // 模拟火山引擎的User-Agent
        'X-Volc-Request-Id': 'test-request-id',
        'Accept': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ 模拟ASR回调成功`);
        console.log(`   状态码: ${res.statusCode}`);
        console.log(`   响应: ${data}`);
        resolve(true);
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ 模拟ASR回调失败: ${err.message}`);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// 3. 检查可能的问题
function checkPossibleIssues() {
  console.log('\n3️⃣ 可能的问题分析:');
  
  console.log('\n🔍 常见问题检查清单:');
  console.log('   □ ngrok隧道是否稳定运行？');
  console.log('   □ 火山引擎是否能访问ngrok URL？');
  console.log('   □ ASR任务是否真的开始处理？');
  console.log('   □ 音频文件是否格式正确？');
  console.log('   □ 回调URL是否在火山引擎白名单中？');
  
  console.log('\n🛠️ 调试建议:');
  console.log('   1. 检查火山引擎控制台是否有错误日志');
  console.log('   2. 确认音频文件大小和格式');
  console.log('   3. 检查ngrok是否有速率限制');
  console.log('   4. 尝试使用固定的ngrok域名（付费版）');
  console.log('   5. 检查防火墙设置');
}

// 4. 实时监控建议
function monitoringSuggestions() {
  console.log('\n4️⃣ 实时监控建议:');
  
  console.log('\n📊 监控方法:');
  console.log('   1. 运行调试监控服务器: node debug/debug_asr_callback_monitor.js');
  console.log('   2. 检查服务器日志是否有回调请求');
  console.log('   3. 使用ngrok的Web界面查看请求历史');
  console.log('   4. 检查数据库中录音状态的变化');
  
  console.log('\n🕐 时间预期:');
  console.log('   - 短音频 (< 1分钟): 通常 10-30秒 内回调');
  console.log('   - 中等音频 (1-5分钟): 通常 30秒-2分钟 内回调');
  console.log('   - 长音频 (> 5分钟): 可能需要 2-10分钟');
}

// 主函数
async function runDiagnostics() {
  console.log(`\n🎯 诊断目标录音ID: ${RECORDING_ID}`);
  console.log(`🌐 回调URL: ${NGROK_URL}${CALLBACK_PATH}`);
  
  // 运行测试
  await testNgrokConnectivity();
  await simulateVolcASRCallback();
  
  checkPossibleIssues();
  monitoringSuggestions();
  
  console.log('\n✅ 诊断完成');
  console.log('💡 如果模拟回调成功但真实回调失败，问题可能在火山引擎端或网络连接。');
}

// 如果直接运行此文件
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = {
  testNgrokConnectivity,
  simulateVolcASRCallback,
  runDiagnostics
};
