// 🐛 ASR响应调试分析工具
const fs = require('fs');
const path = require('path');

const debugFilePath = path.join(__dirname, 'asr_response_debug.json');

// 读取并分析ASR调试数据
function analyzeAsrDebugData() {
  try {
    if (!fs.existsSync(debugFilePath)) {
      console.log('❌ 调试文件不存在:', debugFilePath);
      return;
    }

    const debugData = JSON.parse(fs.readFileSync(debugFilePath, 'utf8'));
    const responses = debugData.responses || [];

    console.log('\n📊 ASR响应调试数据分析');
    console.log('=' .repeat(50));
    console.log(`总响应数量: ${responses.length}`);
    console.log(`最后更新时间: ${debugData.last_updated || '未知'}`);

    if (responses.length === 0) {
      console.log('📝 暂无响应数据');
      return;
    }

    // 状态码统计
    const statusCodes = {};
    const messageCounts = {};
    const avgResponseSize = responses.reduce((sum, r) => sum + (r.response_size || 0), 0) / responses.length;

    responses.forEach(response => {
      const statusCode = response.full_response?.statusCode || 'unknown';
      const message = response.full_response?.message || 'unknown';
      
      statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;
      messageCounts[message] = (messageCounts[message] || 0) + 1;
    });

    console.log('\n📈 状态码分布:');
    Object.entries(statusCodes).forEach(([code, count]) => {
      console.log(`  ${code}: ${count}次`);
    });

    console.log('\n💬 消息分布:');
    Object.entries(messageCounts).forEach(([msg, count]) => {
      console.log(`  ${msg}: ${count}次`);
    });

    console.log(`\n📏 平均响应大小: ${Math.round(avgResponseSize)} bytes`);

    // 显示最近5条记录
    console.log('\n🕐 最近5条记录:');
    const recentResponses = responses.slice(-5);
    recentResponses.forEach((response, index) => {
      console.log(`\n[${index + 1}] ${response.timestamp}`);
      console.log(`  Recording ID: ${response.recording_id}`);
      console.log(`  Request ID: ${response.request_id}`);
      console.log(`  Status: ${response.full_response?.statusCode} - ${response.full_response?.message}`);
      console.log(`  Response Size: ${response.response_size} bytes`);
      
      // 如果有转录结果，显示文本预览
      if (response.full_response?.data?.result?.text) {
        const text = response.full_response.data.result.text;
        console.log(`  Text Preview: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      }
    });

  } catch (error) {
    console.error('❌ 分析调试数据失败:', error);
  }
}

// 查看特定recordingId的响应
function getResponseByRecordingId(recordingId) {
  try {
    if (!fs.existsSync(debugFilePath)) {
      console.log('❌ 调试文件不存在');
      return null;
    }

    const debugData = JSON.parse(fs.readFileSync(debugFilePath, 'utf8'));
    const responses = debugData.responses || [];
    
    const targetResponse = responses.find(r => r.recording_id === recordingId);
    
    if (targetResponse) {
      console.log('\n🔍 找到目标响应:');
      console.log(JSON.stringify(targetResponse, null, 2));
    } else {
      console.log(`❌ 未找到 recordingId: ${recordingId} 的响应`);
    }
    
    return targetResponse;
  } catch (error) {
    console.error('❌ 查询响应失败:', error);
    return null;
  }
}

// 清理旧的调试数据（保留最近N条）
function cleanupDebugData(keepCount = 50) {
  try {
    if (!fs.existsSync(debugFilePath)) {
      console.log('❌ 调试文件不存在');
      return;
    }

    const debugData = JSON.parse(fs.readFileSync(debugFilePath, 'utf8'));
    const responses = debugData.responses || [];
    
    if (responses.length <= keepCount) {
      console.log(`✅ 当前有 ${responses.length} 条记录，无需清理`);
      return;
    }

    debugData.responses = responses.slice(-keepCount);
    debugData.last_updated = new Date().toISOString();
    debugData.cleaned_at = new Date().toISOString();

    fs.writeFileSync(debugFilePath, JSON.stringify(debugData, null, 2), 'utf8');
    console.log(`🧹 已清理调试数据，保留最近 ${keepCount} 条记录`);
    
  } catch (error) {
    console.error('❌ 清理调试数据失败:', error);
  }
}

module.exports = {
  analyzeAsrDebugData,
  getResponseByRecordingId,
  cleanupDebugData
};

// 如果直接运行此文件，显示分析结果
if (require.main === module) {
  const command = process.argv[2];
  const param = process.argv[3];

  switch (command) {
    case 'analyze':
      analyzeAsrDebugData();
      break;
    case 'get':
      if (param) {
        getResponseByRecordingId(param);
      } else {
        console.log('❌ 请提供 recordingId: node debug_asr_response.js get <recordingId>');
      }
      break;
    case 'cleanup':
      const keepCount = param ? parseInt(param) : 50;
      cleanupDebugData(keepCount);
      break;
    default:
      console.log('📖 使用方法:');
      console.log('  node debug_asr_response.js analyze              - 分析所有响应数据');
      console.log('  node debug_asr_response.js get <recordingId>    - 查看特定记录的响应');
      console.log('  node debug_asr_response.js cleanup [keepCount]  - 清理旧数据，保留最近N条');
      analyzeAsrDebugData();
  }
}
