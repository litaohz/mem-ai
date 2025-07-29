// 播放按钮灰色问题诊断脚本
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'recordings.db');
const uploadDir = path.join(__dirname, 'uploads');

console.log('🔍 开始诊断播放按钮灰色问题...\n');

// 1. 检查数据库中的录音记录
console.log('📋 1. 检查数据库中的录音记录:');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err);
    return;
  }
  
  db.all(`
    SELECT 
      id, 
      filename, 
      original_name, 
      status, 
      tos_upload_status,
      tos_file_url,
      transcription IS NOT NULL as has_transcription
    FROM recordings 
    ORDER BY created_at DESC 
    LIMIT 5
  `, (err, rows) => {
    if (err) {
      console.error('❌ 查询失败:', err);
      return;
    }
    
    console.log(`   找到 ${rows.length} 条录音记录:`);
    rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.original_name}`);
      console.log(`      文件名: ${row.filename}`);
      console.log(`      状态: ${row.status}`);
      console.log(`      TOS状态: ${row.tos_upload_status || 'pending'}`);
      console.log(`      有转写: ${row.has_transcription ? '是' : '否'}`);
      console.log(`      TOS URL: ${row.tos_file_url ? '是' : '否'}`);
      
      // 检查本地文件是否存在
      const filePath = path.join(uploadDir, row.filename);
      const fileExists = fs.existsSync(filePath);
      console.log(`      本地文件存在: ${fileExists ? '是' : '否'}`);
      
      if (fileExists) {
        const stats = fs.statSync(filePath);
        console.log(`      文件大小: ${Math.round(stats.size / 1024)}KB`);
      }
      console.log('');
    });
    
    // 2. 分析可能的问题
    console.log('🔍 2. 问题分析:');
    
    const completedRecordings = rows.filter(r => r.status === 'completed');
    const withLocalFiles = rows.filter(r => {
      const filePath = path.join(uploadDir, r.filename);
      return fs.existsSync(filePath);
    });
    
    console.log(`   - 已完成转写的录音: ${completedRecordings.length}/${rows.length}`);
    console.log(`   - 有本地文件的录音: ${withLocalFiles.length}/${rows.length}`);
    
    if (completedRecordings.length === 0) {
      console.log('   ⚠️  没有已完成的录音，播放按钮会被禁用');
    }
    
    if (withLocalFiles.length === 0) {
      console.log('   ❌ 没有本地音频文件，无法播放');
    }
    
    // 3. 解决方案建议
    console.log('\n💡 3. 解决方案建议:');
    
    if (rows.length === 0) {
      console.log('   - 没有录音记录，请先录制或上传音频文件');
    } else if (completedRecordings.length === 0) {
      console.log('   - 录音还在处理中，等待转写完成后即可播放');
    } else if (withLocalFiles.length === 0) {
      console.log('   - 本地音频文件丢失，请检查 uploads/ 目录');
    } else {
      console.log('   - 数据看起来正常，可能是前端代码问题');
      console.log('   - 建议检查浏览器控制台是否有错误信息');
      console.log('   - 确认服务器端 /api/audio/:filename 端点是否工作正常');
    }
    
    // 4. 测试音频端点
    console.log('\n🧪 4. 测试建议:');
    if (withLocalFiles.length > 0) {
      const testFile = withLocalFiles[0].filename;
      console.log(`   在浏览器中测试: http://localhost:3000/api/audio/${testFile}`);
      console.log(`   应该返回音频文件而不是错误`);
    }
    
    db.close();
  });
});

// 5. 检查uploads目录
console.log('\n📁 5. 检查uploads目录:');
try {
  const files = fs.readdirSync(uploadDir);
  console.log(`   找到 ${files.length} 个文件:`);
  files.forEach((file, index) => {
    const filePath = path.join(uploadDir, file);
    const stats = fs.statSync(filePath);
    console.log(`   ${index + 1}. ${file} (${Math.round(stats.size / 1024)}KB)`);
  });
} catch (err) {
  console.error('   ❌ 无法读取uploads目录:', err.message);
}
