// 测试TOS SDK导入方式
console.log('🧪 测试TOS SDK导入方式...\n');

// 尝试方式1：直接导入
try {
  const TosClient1 = require('@volcengine/tos-sdk');
  console.log('方式1 - require(@volcengine/tos-sdk):');
  console.log('  类型:', typeof TosClient1);
  console.log('  构造函数:', typeof TosClient1);
  console.log('  是否为函数:', typeof TosClient1 === 'function');
  console.log('  属性:', Object.keys(TosClient1).slice(0, 5));
} catch (e) {
  console.log('方式1 失败:', e.message);
}

console.log('\n---\n');

// 尝试方式2：解构导入
try {
  const { TosClient } = require('@volcengine/tos-sdk');
  console.log('方式2 - { TosClient } = require(@volcengine/tos-sdk):');
  console.log('  类型:', typeof TosClient);
  console.log('  是否为函数:', typeof TosClient === 'function');
} catch (e) {
  console.log('方式2 失败:', e.message);
}

console.log('\n---\n');

// 尝试方式3：检查模块结构
try {
  const tosModule = require('@volcengine/tos-sdk');
  console.log('方式3 - 模块结构分析:');
  console.log('  模块类型:', typeof tosModule);
  console.log('  模块属性:', Object.keys(tosModule));
  
  if (tosModule.default) {
    console.log('  default 属性类型:', typeof tosModule.default);
    console.log('  default 是否为函数:', typeof tosModule.default === 'function');
  }
} catch (e) {
  console.log('方式3 失败:', e.message);
}

console.log('\n---\n');

// 尝试方式4：ES6 default 导入模拟
try {
  const tosModule = require('@volcengine/tos-sdk');
  const TosClient4 = tosModule.default || tosModule;
  console.log('方式4 - default fallback:');
  console.log('  类型:', typeof TosClient4);
  console.log('  是否为函数:', typeof TosClient4 === 'function');
} catch (e) {
  console.log('方式4 失败:', e.message);
}
