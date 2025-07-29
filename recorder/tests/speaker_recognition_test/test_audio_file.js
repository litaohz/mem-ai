// 🔍 测试音频文件
const fs = require('fs');
const path = require('path');

// 测试文件路径
const TEST_AUDIO_FILE = process.argv[2];

if (!TEST_AUDIO_FILE) {
  console.error('❌ 错误：未提供音频文件路径');
  console.error('用法: node test_audio_file.js [音频文件路径]');
  console.error('示例: node test_audio_file.js 1753784804508-12235786.webm');
  process.exit(1);
}

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const AUDIO_FILE_PATH = path.join(UPLOADS_DIR, TEST_AUDIO_FILE);

// 检查文件是否存在
console.log(`🔍 检查文件: ${AUDIO_FILE_PATH}`);

if (!fs.existsSync(AUDIO_FILE_PATH)) {
  console.error(`❌ 错误：文件不存在 - ${AUDIO_FILE_PATH}`);
  process.exit(1);
}

// 获取文件信息
const fileStats = fs.statSync(AUDIO_FILE_PATH);
const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
const fileExtension = path.extname(AUDIO_FILE_PATH).toLowerCase();

console.log('\n📊 文件信息:');
console.log('-'.repeat(40));
console.log(`📁 文件名: ${path.basename(AUDIO_FILE_PATH)}`);
console.log(`📂 目录: ${path.dirname(AUDIO_FILE_PATH)}`);
console.log(`📏 大小: ${fileSizeMB} MB (${fileStats.size} 字节)`);
console.log(`📅 创建时间: ${fileStats.birthtime.toLocaleString()}`);
console.log(`📝 修改时间: ${fileStats.mtime.toLocaleString()}`);
console.log(`🔍 文件类型: ${fileExtension}`);

// 检查文件类型
const supportedFormats = ['.webm', '.wav', '.mp3', '.ogg', '.m4a'];

if (!supportedFormats.includes(fileExtension)) {
  console.warn(`⚠️ 警告：文件格式 ${fileExtension} 可能不受支持`);
  console.warn(`支持的格式: ${supportedFormats.join(', ')}`);
} else {
  console.log(`✅ 文件格式 ${fileExtension} 受支持`);
}

// 读取文件头部
try {
  const fileHandle = fs.openSync(AUDIO_FILE_PATH, 'r');
  const buffer = Buffer.alloc(16); // 读取前16字节用于识别文件类型
  
  fs.readSync(fileHandle, buffer, 0, 16, 0);
  fs.closeSync(fileHandle);
  
  console.log('\n🔍 文件头部分析:');
  console.log('-'.repeat(40));
  console.log(`十六进制: ${buffer.toString('hex')}`);
  
  // 简单的文件类型检测
  let detectedFormat = '未知';
  
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
    detectedFormat = 'WAV';
  } else if (buffer.toString('hex', 0, 4) === '1a45dfa3') {
    detectedFormat = 'WebM';
  } else if (buffer.toString('hex', 0, 3) === '494433' || buffer.toString('hex', 0, 2) === 'fffa' || buffer.toString('hex', 0, 2) === 'fffb') {
    detectedFormat = 'MP3';
  } else if (buffer.toString('ascii', 0, 4) === 'OggS') {
    detectedFormat = 'Ogg';
  }
  
  console.log(`检测到的格式: ${detectedFormat}`);
  
  if (detectedFormat === '未知') {
    console.warn('⚠️ 警告：无法识别文件格式，可能不是有效的音频文件');
  } else {
    console.log(`✅ 文件头部检测为 ${detectedFormat} 格式`);
  }
  
} catch (error) {
  console.error(`❌ 读取文件头部时出错: ${error.message}`);
}

console.log('\n✅ 文件检查完成');