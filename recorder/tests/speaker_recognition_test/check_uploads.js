// 🔍 检查uploads目录并列出音频文件
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

console.log('🔍 检查uploads目录...');

// 检查uploads目录是否存在
if (!fs.existsSync(uploadsDir)) {
  console.log('📁 uploads目录不存在，正在创建...');
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ uploads目录已创建');
  } catch (error) {
    console.error('❌ 创建uploads目录失败:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ uploads目录已存在');
}

// 列出uploads目录中的文件
console.log('\n📊 uploads目录中的文件:');
console.log('-'.repeat(40));

try {
  const files = fs.readdirSync(uploadsDir);
  
  if (files.length === 0) {
    console.log('📂 uploads目录为空');
    console.log('请将音频文件（如1753784804508-12235786.webm）复制到uploads目录');
  } else {
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.webm', '.wav', '.mp3', '.ogg', '.m4a'].includes(ext);
    });
    
    if (audioFiles.length === 0) {
      console.log('📂 没有找到音频文件');
      console.log('支持的格式: .webm, .wav, .mp3, .ogg, .m4a');
    } else {
      console.log(`找到 ${audioFiles.length} 个音频文件:`);
      audioFiles.forEach((file, index) => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`  ${index + 1}. ${file} (${sizeMB} MB)`);
      });
    }
  }
} catch (error) {
  console.error('❌ 读取uploads目录失败:', error.message);
}

console.log('\n📋 使用说明:');
console.log('请将音频文件（如1753784804508-12235786.webm）复制到uploads目录');
console.log('然后运行: node test_asr_with_speaker_info.js 文件名');