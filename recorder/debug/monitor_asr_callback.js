// 持续监控ASR回调状态
const sqlite3 = require('sqlite3').verbose();

const RECORDING_ID = '9f475b12-7099-4f0e-9457-d5299bcbf4bf';
const CHECK_INTERVAL = 10000; // 10秒检查一次

console.log('🔍 开始监控ASR回调状态...');
console.log(`📋 录音ID: ${RECORDING_ID}`);
console.log(`⏱️  检查间隔: ${CHECK_INTERVAL/1000}秒`);
console.log('=' * 50);

let lastStatus = null;
let checkCount = 0;

function checkRecordingStatus() {
  const db = new sqlite3.Database('./recordings.db');
  
  db.get(
    'SELECT id, status, transcription, created_at FROM recordings WHERE id = ?',
    [RECORDING_ID],
    (err, row) => {
      checkCount++;
      const now = new Date().toISOString();
      
      if (err) {
        console.log(`❌ [${now}] 检查 #${checkCount} - 数据库错误:`, err);
        return;
      }
      
      if (!row) {
        console.log(`❌ [${now}] 检查 #${checkCount} - 未找到录音记录`);
        return;
      }
      
      const currentStatus = row.status;
      const hasTranscription = !!row.transcription;
      
      if (currentStatus !== lastStatus) {
        console.log(`🔄 [${now}] 检查 #${checkCount} - 状态变化: ${lastStatus} → ${currentStatus}`);
        lastStatus = currentStatus;
        
        if (currentStatus === 'completed' && hasTranscription) {
          console.log('🎉 转录完成！');
          console.log('📝 转录结果预览:');
          
          try {
            const transcriptionData = JSON.parse(row.transcription);
            console.log('   文本:', transcriptionData.text?.substring(0, 100) + '...');
            console.log('   来源:', transcriptionData.source || 'unknown');
            console.log('   完成时间:', transcriptionData.completed_at);
          } catch (e) {
            console.log('   原始结果:', row.transcription?.substring(0, 100) + '...');
          }
          
          console.log('\n✅ 监控完成 - ASR回调成功！');
          process.exit(0);
        }
      } else {
        console.log(`⏳ [${now}] 检查 #${checkCount} - 状态: ${currentStatus} (无变化)`);
      }
      
      // 计算等待时间
      const createdAt = new Date(row.created_at);
      const waitTime = Math.floor((new Date() - createdAt) / 1000);
      console.log(`   已等待: ${waitTime}秒`);
      
      // 如果等待超过10分钟，提示可能有问题
      if (waitTime > 600) {
        console.log('⚠️  等待时间过长，可能有以下问题:');
        console.log('   - 音频文件过大或格式有问题');
        console.log('   - 火山引擎服务繁忙');
        console.log('   - 回调URL无法访问');
        console.log('   - ASR任务提交失败但未收到错误通知');
      }
      
      db.close();
    }
  );
}

// 立即检查一次
checkRecordingStatus();

// 设置定时器
const interval = setInterval(checkRecordingStatus, CHECK_INTERVAL);

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 停止监控...');
  clearInterval(interval);
  process.exit(0);
});

// 自动停止（30分钟后）
setTimeout(() => {
  console.log('\n⏰ 监控超时（30分钟），自动停止');
  console.log('💡 如果还没有收到回调，建议检查:');
  console.log('   1. 火山引擎控制台的任务状态');
  console.log('   2. 音频文件是否符合要求');
  console.log('   3. 网络连接是否稳定');
  clearInterval(interval);
  process.exit(1);
}, 30 * 60 * 1000);
