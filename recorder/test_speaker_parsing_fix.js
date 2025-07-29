#!/usr/bin/env node

/**
 * 说话人解析修复验证脚本
 * 验证 utterance.additions.speaker 字段的正确解析
 */

const fs = require('fs');
const path = require('path');

// 导入修复后的说话人提取函数
const asrPollingPath = path.join(__dirname, 'lib', 'asr-polling.js');
const asrPollingCode = fs.readFileSync(asrPollingPath, 'utf8');

// 提取 extractSpeakerInfo 函数
const extractSpeakerInfoMatch = asrPollingCode.match(/function extractSpeakerInfo\(utterances\) \{[\s\S]*?\n\}/);
if (!extractSpeakerInfoMatch) {
  console.error('❌ 无法找到 extractSpeakerInfo 函数');
  process.exit(1);
}

// 动态执行函数
eval(extractSpeakerInfoMatch[0]);

console.log('🧪 说话人解析修复验证测试');
console.log('=' .repeat(50));

// 测试数据：模拟真实的 ASR 响应结构
const testUtterances = [
  {
    "additions": { "speaker": "1" },
    "end_time": 1620,
    "start_time": 1020,
    "text": "你好。"
  },
  {
    "additions": { "speaker": "1" },
    "end_time": 2220,
    "start_time": 1740,
    "text": "你好。"
  },
  {
    "additions": { "speaker": "2" },
    "end_time": 4620,
    "start_time": 2340,
    "text": "你叫什么名字？"
  },
  {
    "additions": { "speaker": "2" },
    "end_time": 8220,
    "start_time": 4740,
    "text": "我叫李涛涛。"
  }
];

console.log('📋 测试数据:');
testUtterances.forEach((utterance, index) => {
  console.log(`  ${index + 1}. 说话人: ${utterance.additions.speaker}, 文本: "${utterance.text}"`);
});

console.log('\n🔍 执行说话人解析...');
const result = extractSpeakerInfo(testUtterances);

console.log('\n📊 解析结果:');
console.log(`  检测到说话人数量: ${result.speaker_count}`);
console.log(`  摘要: ${result.summary}`);

console.log('\n👥 说话人详情:');
result.speakers.forEach((speaker, index) => {
  console.log(`  ${index + 1}. 说话人${speaker.id}:`);
  console.log(`     - 总时长: ${speaker.total_duration}ms`);
  console.log(`     - 片段数: ${speaker.segment_count}`);
  console.log(`     - 文字数: ${speaker.words_count}`);
});

console.log('\n🎭 对话片段:');
result.segments.forEach((segment, index) => {
  const startSec = Math.floor(segment.start_time / 1000);
  const endSec = Math.floor(segment.end_time / 1000);
  console.log(`  ${index + 1}. [${startSec}s-${endSec}s] 说话人${segment.speaker}: ${segment.text}`);
});

// 验证修复效果
console.log('\n✅ 验证结果:');
const hasValidSpeakers = result.speakers.every(speaker => speaker.id !== 'unknown');
const correctSpeakerCount = result.speaker_count === 2;
const hasCorrectSegments = result.segments.every(segment => segment.speaker !== 'unknown');

if (hasValidSpeakers && correctSpeakerCount && hasCorrectSegments) {
  console.log('🎉 说话人解析修复成功！');
  console.log('   ✓ 所有说话人都被正确识别');
  console.log('   ✓ 说话人数量统计正确');
  console.log('   ✓ 对话片段说话人标识正确');
} else {
  console.log('❌ 说话人解析仍有问题：');
  if (!hasValidSpeakers) console.log('   ✗ 存在未识别的说话人');
  if (!correctSpeakerCount) console.log('   ✗ 说话人数量统计错误');
  if (!hasCorrectSegments) console.log('   ✗ 对话片段说话人标识错误');
}

console.log('\n🔧 修复详情:');
console.log('   原代码: const speaker = utterance.speaker || \'unknown\';');
console.log('   修复后: const speaker = utterance.additions?.speaker || \'unknown\';');
console.log('   说明: 使用可选链式运算符访问嵌套的 additions.speaker 字段');