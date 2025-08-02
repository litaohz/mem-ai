const { TosClient } = require('@volcengine/tos-sdk');

// TOS配置
const tosConfig = {
  region: 'cn-beijing',
  endpoint: 'tos-cn-beijing.volces.com',
  // 请在环境变量中设置这些值，或者使用其他安全方式
  accessKeyId: process.env.VOLC_ACCESSKEY || '',
  accessKeySecret: process.env.VOLC_SECRETKEY || '',
  bucket: process.env.TOS_BUCKET || '' // 存储桶名称
};

// 创建TOS客户端
function createTosClient() {
  if (!tosConfig.accessKeyId || !tosConfig.accessKeySecret) {
    console.log('⚠️  TOS配置缺失，上传功能将被禁用');
    console.log('💡 要启用TOS上传功能，请：');
    console.log('   1. 复制 .env.example 为 .env');
    console.log('   2. 在 .env 中配置您的火山引擎凭据');
    console.log('   3. 重启应用');
    throw new Error('TOS配置缺失：请设置VOLC_ACCESSKEY和VOLC_SECRETKEY环境变量');
  }
  
  return new TosClient({
    region: tosConfig.region,
    endpoint: tosConfig.endpoint,
    accessKeyId: tosConfig.accessKeyId,
    accessKeySecret: tosConfig.accessKeySecret,
  });
}

// 上传文件到TOS
async function uploadFileToTos(filePath, fileName, recordingId) {
  try {
    console.log(`🔧 TOS上传准备:`);
    console.log(`  - 文件路径: ${filePath}`);
    console.log(`  - 文件名: ${fileName}`);
    console.log(`  - 录音ID: ${recordingId}`);
    console.log(`  - TOS配置检查:`);
    console.log(`    - Region: ${tosConfig.region}`);
    console.log(`    - Endpoint: ${tosConfig.endpoint}`);
    console.log(`    - Bucket: ${tosConfig.bucket}`);
    console.log(`    - AccessKey: ${tosConfig.accessKeyId ? '已设置' : '未设置'}`);
    console.log(`    - SecretKey: ${tosConfig.accessKeySecret ? '已设置' : '未设置'}`);
    
    const client = createTosClient();
    const fs = require('fs');
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    // 获取文件信息
    const fileStats = fs.statSync(filePath);
    console.log(`📊 文件统计信息:`);
    console.log(`  - 文件大小: ${fileStats.size} bytes (${(fileStats.size / 1024).toFixed(2)}KB)`);
    console.log(`  - 修改时间: ${fileStats.mtime}`);
    
    // 生成TOS对象键名（包含路径）
    const objectKey = `recordings/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${recordingId}/${fileName}`;
    console.log(`🔑 生成对象键: ${objectKey}`);
    
    // 读取文件
    console.log(`📖 读取文件内容...`);
    const fileContent = fs.readFileSync(filePath);
    console.log(`✅ 文件读取成功，内容大小: ${fileContent.length} bytes`);
    
    // 获取内容类型
    const contentType = getContentType(fileName);
    console.log(`📝 内容类型: ${contentType}`);
    
    // 上传文件
    console.log(`🚀 开始上传到TOS...`);
    const result = await client.putObject({
      bucket: tosConfig.bucket,
      key: objectKey,
      body: fileContent,
      contentType: contentType,
      // 设置元数据
      meta: {
        'recording-id': recordingId,
        'upload-time': new Date().toISOString(),
        'source': 'rose-voice-recorder'
      }
    });
    
    console.log(`✅ TOS上传成功:`);
    console.log(`  - 对象键: ${objectKey}`);
    console.log(`  - ETag: ${result.etag}`);
    console.log(`  - 版本ID: ${result.versionId}`);
    
    // 返回文件的TOS URL
    const fileUrl = `https://${tosConfig.bucket}.${tosConfig.endpoint}/${objectKey}`;
    console.log(`🔗 文件URL: ${fileUrl}`);
    
    return {
      success: true,
      objectKey,
      fileUrl,
      etag: result.etag,
      versionId: result.versionId
    };
    
  } catch (error) {
    console.error('❌ TOS上传失败:', error);
    console.error('  - 错误类型:', error.name);
    console.error('  - 错误代码:', error.code);
    console.error('  - 错误消息:', error.message);
    console.error('  - 错误堆栈:', error.stack);
    
    // 检查是否是配置问题
    if (error.message.includes('TOS配置缺失')) {
      console.error('🔧 TOS配置问题，请检查环境变量');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// 根据文件扩展名获取MIME类型
function getContentType(fileName) {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'webm': 'audio/webm',
    'ogg': 'audio/ogg'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// 删除TOS文件（可选功能）
async function deleteFileFromTos(objectKey) {
  try {
    const client = createTosClient();
    
    await client.deleteObject({
      bucket: tosConfig.bucket,
      key: objectKey
    });
    
    console.log(`🗑️ 文件已从TOS删除: ${objectKey}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ TOS删除失败:', error);
    return { success: false, error: error.message };
  }
}

// 获取TOS文件的预签名URL（用于临时访问）
async function getPresignedUrl(objectKey, expirationSeconds = 3600) {
  try {
    const client = createTosClient();
    
    const url = await client.getPreSignedUrl({
      bucket: tosConfig.bucket,
      key: objectKey,
      expirationSeconds // 默认1小时过期
    });
    
    return { success: true, url };
    
  } catch (error) {
    console.error('❌ 生成预签名URL失败:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  uploadFileToTos,
  deleteFileFromTos,
  getPresignedUrl,
  tosConfig
};
