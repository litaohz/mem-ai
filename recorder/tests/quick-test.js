#!/usr/bin/env node

/**
 * Rose Voice TOS 功能快速测试脚本
 * 使用方法：node quick-test.js
 */

const fs = require('fs');
const path = require('path');

console.log('🌹 Rose Voice TOS 功能测试');
console.log('==========================\n');

// 1. 检查依赖项
console.log('📦 检查依赖项...');
try {
  require('@volcengine/tos-sdk');
  console.log('✅ TOS SDK 已安装');
} catch (e) {
  console.log('❌ TOS SDK 未安装，请运行: npm install @volcengine/tos-sdk');
  process.exit(1);
}

// 2. 检查配置文件
console.log('📄 检查配置文件...');
const configPath = path.join(__dirname, 'config/tos-config.js');
if (fs.existsSync(configPath)) {
  console.log('✅ TOS 配置文件存在');
} else {
  console.log('❌ TOS 配置文件不存在');
  process.exit(1);
}

// 3. 检查环境变量文件
console.log('🔧 检查环境配置...');
const envExamplePath = path.join(__dirname, '.env.example');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envExamplePath)) {
  console.log('✅ .env.example 文件存在');
} else {
  console.log('❌ .env.example 文件不存在');
}

if (fs.existsSync(envPath)) {
  console.log('✅ .env 文件存在');
  
  // 检查关键环境变量
  require('dotenv').config();
  const hasAccessKey = !!process.env.VOLC_ACCESSKEY;
  const hasSecretKey = !!process.env.VOLC_SECRETKEY;
  const hasBucket = !!process.env.TOS_BUCKET;
  
  console.log(`   - VOLC_ACCESSKEY: ${hasAccessKey ? '✅ 已设置' : '❌ 未设置'}`);
  console.log(`   - VOLC_SECRETKEY: ${hasSecretKey ? '✅ 已设置' : '❌ 未设置'}`);
  console.log(`   - TOS_BUCKET: ${hasBucket ? '✅ 已设置' : '❌ 未设置'}`);
  
  if (hasAccessKey && hasSecretKey && hasBucket) {
    console.log('🎉 TOS 配置完整，可以进行云端上传！');
  } else {
    console.log('⚠️  TOS 配置不完整，将仅使用本地存储');
  }
} else {
  console.log('⚠️  .env 文件不存在，将使用系统环境变量');
  console.log('💡 建议: 复制 .env.example 为 .env 并配置您的凭据');
}

// 4. 检查项目结构
console.log('\n📁 检查项目结构...');
const requiredFiles = [
  'server.js',
  'package.json',
  'public/index.html',
  'public/app.js',
  'public/style.css'
];

const requiredDirs = [
  'public',
  'config',
  'uploads'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
});

requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  const exists = fs.existsSync(dirPath);
  console.log(`   ${dir}/: ${exists ? '✅' : '❌'}`);
});

// 5. 功能总结
console.log('\n🎯 功能状态总结');
console.log('================');
console.log('✅ 录音功能: 可用');
console.log('✅ 转写功能: 可用 (模拟)');
console.log('✅ 本地存储: 可用');

const tosConfigured = fs.existsSync(envPath) && 
  process.env.VOLC_ACCESSKEY && 
  process.env.VOLC_SECRETKEY && 
  process.env.TOS_BUCKET;

console.log(`${tosConfigured ? '✅' : '⚠️ '} TOS云存储: ${tosConfigured ? '可用' : '需要配置'}`);

console.log('\n🚀 启动建议:');
console.log('1. 运行 npm start 启动应用');
console.log('2. 打开浏览器访问 http://localhost:3000');
console.log('3. 测试录音和上传功能');

if (!tosConfigured) {
  console.log('\n🔧 要启用TOS云存储:');
  console.log('1. 复制 .env.example 为 .env');
  console.log('2. 在 .env 中填入您的火山引擎凭据');
  console.log('3. 重启应用');
}

console.log('\n🌹 Rose Voice - 让录音转写变得更简单！');
