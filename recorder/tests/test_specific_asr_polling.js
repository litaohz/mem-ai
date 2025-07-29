// 🧪 专门测试指定录音的ASR轮询功能
// 录音ID: 1753776247182-385721110
// 请求ID: 8e81b506-e251-4751-8d5e-c7ebf97bbef8
require('dotenv').config();

const { startAsrPolling, queryAsrResult, ASR_CONFIG } = require('../lib/asr-polling');
const { initDatabase } = require('../config/database');

// 测试参数
const TEST_CONFIG = {
  recordingId: '1753776247182-385721110',
  requestId: '8e81b506-e251-4751-8d5e-c7ebf97bbef8'
};

// 🧪 测试指定录音的ASR轮询
async function testSpecificAsrPolling() {
  console.log('🧪 开始测试指定录音的ASR轮询功能\n');
  console.log(`📋 测试目标:`);
  console.log(`   录音ID: ${TEST_CONFIG.recordingId}`);
  console.log(`   请求ID: ${TEST_CONFIG.requestId}`);
  console.log('');
  
  // 1. 初始化数据库
  console.log('📄 1. 初始化数据库...');
  const db = await new Promise((resolve) => {
    initDatabase((database) => {
      console.log('✅ 数据库连接成功');
      resolve(database);
    });
  });
  
  // 2. 检查录音记录是否存在
  console.log('\n🔍 2. 检查录音记录...');
  
  try {
    const recordingExists = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM recordings WHERE filename LIKE ? OR id = ?`,
        [`%${TEST_CONFIG.recordingId}%`, TEST_CONFIG.recordingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (recordingExists) {
      console.log('✅ 找到录音记录:');
      console.log(`   ID: ${recordingExists.id}`);
      console.log(`   文件名: ${recordingExists.filename}`);
      console.log(`   原始名称: ${recordingExists.original_name}`);
      console.log(`   状态: ${recordingExists.status}`);
      console.log(`   当前请求ID: ${recordingExists.request_id || '无'}`);
      console.log(`   创建时间: ${recordingExists.created_at}`);
    } else {
      console.log('⚠️ 未找到该录音记录，将创建测试记录');
      
      // 创建测试记录
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO recordings (filename, original_name, status, request_id, created_at) 
           VALUES (?, ?, ?, ?, datetime('now'))`,
          [`${TEST_CONFIG.recordingId}.webm`, `${TEST_CONFIG.recordingId}.webm`, 'polling', TEST_CONFIG.requestId],
          function(err) {
            if (err) reject(err);
            else {
              console.log(`✅ 测试记录已创建，数据库ID: ${this.lastID}`);
              resolve();
            }
          }
        );
      });
    }
  } catch (error) {
    console.error('❌ 检查录音记录失败:', error);
    return;
  }
  
  // 3. 检查ASR配置
  console.log('\n🔧 3. 检查ASR配置...');
  console.log(`   App Key: ${ASR_CONFIG.appKey ? '已设置' : '❌ 未设置'}`);
  console.log(`   Access Key: ${ASR_CONFIG.accessKey ? '已设置' : '❌ 未设置'}`);
  console.log(`   提交URL: ${ASR_CONFIG.submitUrl}`);
  console.log(`   查询URL: ${ASR_CONFIG.queryUrl}`);
  console.log(`   轮询间隔: ${ASR_CONFIG.pollInterval/1000}秒`);
  console.log(`   最大轮询时间: ${ASR_CONFIG.maxPollTime/1000/60}分钟`);
  
  if (!ASR_CONFIG.appKey || !ASR_CONFIG.accessKey) {
    console.error('❌ ASR配置不完整，请检查环境变量 APP_KEY 和 ACCESSKEY');
    return;
  }
  
  // 4. 直接查询ASR结果
  console.log('\n🔍 4. 直接查询ASR结果...');
  
  try {
    const queryResult = await queryAsrResult(TEST_CONFIG.requestId);
    console.log('📋 查询响应:');
    console.log(`   状态码: ${queryResult.statusCode}`);
    console.log(`   状态消息: ${queryResult.message}`);
    console.log(`   日志ID: ${queryResult.logid}`);
    
    // 解析状态
    switch (queryResult.statusCode) {
      case '20000000':
        console.log('🎉 转录已完成！');
        if (queryResult.data && queryResult.data.result) {
          console.log(`📝 转录文本: ${queryResult.data.result.text || '无文本'}`);
          console.log(`📊 话者数量: ${queryResult.data.result.utterances ? queryResult.data.result.utterances.length : 0}`);
          if (queryResult.data.audio_info) {
            console.log(`🎵 音频时长: ${queryResult.data.audio_info.duration || '未知'}秒`);
            console.log(`🎵 音频格式: ${queryResult.data.audio_info.format || '未知'}`);
          }
        }
        break;
      case '20000001':
        console.log('⏳ 转录正在处理中...');
        break;
      case '20000002':
        console.log('⏳ 任务在队列中等待...');
        break;
      default:
        console.log(`❌ 转录失败或异常状态: ${queryResult.message}`);
    }
    
  } catch (error) {
    console.error('❌ 查询ASR结果失败:', error);
    console.log('🔧 可能的原因:');
    console.log('   1. 请求ID无效或已过期');
    console.log('   2. ASR服务暂时不可用');
    console.log('   3. 网络连接问题');
    console.log('   4. 认证信息错误');
  }
  
  // 5. 询问是否启动轮询
  console.log('\n🔄 5. 轮询选项...');
  console.log('如果上面的查询结果显示转录还在处理中，您可以选择启动轮询服务。');
  console.log('轮询将每10秒查询一次，直到转录完成或超时（10分钟）。');
  
  // 询问用户是否要启动轮询
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  try {
    const answer = await new Promise((resolve) => {
      rl.question('是否启动轮询服务？(y/n): ', (answer) => {
        resolve(answer.toLowerCase());
      });
    });
    
    if (answer === 'y' || answer === 'yes') {
      console.log('\n🚀 启动轮询服务...');
      
      // 更新数据库状态为轮询中
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE recordings SET status = ?, request_id = ? WHERE filename LIKE ?`,
          ['polling', TEST_CONFIG.requestId, `%${TEST_CONFIG.recordingId}%`],
          function(err) {
            if (err) reject(err);
            else {
              console.log(`✅ 已更新数据库状态为轮询中 (影响行数: ${this.changes})`);
              resolve();
            }
          }
        );
      });
      
      // 启动轮询
      startAsrPolling(TEST_CONFIG.recordingId, TEST_CONFIG.requestId, db);
      
      console.log('⏱️ 轮询已启动，将持续监控转录进度...');
      console.log('💡 您可以按 Ctrl+C 终止程序');
      
      // 保持程序运行，让轮询继续
      process.on('SIGINT', () => {
        console.log('\n\n🛑 收到中断信号，正在关闭...');
        db.close((err) => {
          if (err) {
            console.error('❌ 关闭数据库失败:', err);
          } else {
            console.log('✅ 数据库连接已关闭');
          }
          process.exit(0);
        });
      });
      
    } else {
      console.log('⏭️ 跳过轮询，测试结束');
      
      // 关闭数据库
      db.close((err) => {
        if (err) {
          console.error('❌ 关闭数据库失败:', err);
        } else {
          console.log('✅ 数据库连接已关闭');
        }
      });
    }
    
  } finally {
    rl.close();
  }
  
  console.log('\n🎉 ASR轮询测试完成！');
  console.log('\n📊 测试总结:');
  console.log('  ✅ 数据库连接正常');
  console.log('  ✅ 录音记录检查完成');
  console.log('  ✅ ASR配置验证完成');
  console.log('  ✅ ASR查询API测试完成');
  
}

// 运行测试
if (require.main === module) {
  testSpecificAsrPolling().catch(error => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
}

module.exports = { testSpecificAsrPolling, TEST_CONFIG };
