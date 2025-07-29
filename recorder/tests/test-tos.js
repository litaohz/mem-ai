require('dotenv').config();
const { tosConfig } = require('./config/tos-config.js');

console.log('🔧 TOS配置检查:');
console.log('Region:', tosConfig.region);
console.log('Endpoint:', tosConfig.endpoint);
console.log('Bucket:', tosConfig.bucket);
console.log('AccessKey设置:', !!process.env.VOLC_ACCESSKEY);
console.log('SecretKey设置:', !!process.env.VOLC_SECRETKEY);

if (!tosConfig.bucket) {
  console.error('❌ 错误：TOS_BUCKET 环境变量未设置');
  process.exit(1);
}

console.log('✅ TOS配置检查完成');
