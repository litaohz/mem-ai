// 🎯 模拟测试说话人识别功能（无需API访问）
const fs = require('fs');
const path = require('path');
const { extractSpeakerInfo } = require('../../lib/asr-polling');

console.log('🎯 模拟测试说话人识别功能');
console.log('='.repeat(50));
console.log('注意：此测试使用模拟数据，不需要实际API访问');
console.log('='.repeat(50));

// 模拟ASR返回的utterances数据（包含说话人信息）
const mockUtterances = [
  {
    speaker: '1',
    start_time: 0,
    end_time: 3500,
    text: '大家好，欢迎参加今天的会议。'
  },
  {
    speaker: '2', 
    start_time: 4000,
    end_time: 7200,
    text: '谢谢主持人，我来介绍一下这个项目的进展。'
  },
  {
    speaker: '1',
    start_time: 8000,
    end_time: 10500,
    text: '好的，请开始你的介绍。'
  },
  {
    speaker: '2',
    start_time: 11000,
    end_time: 18500,
    text: '我们这个月完成了用户界面的设计，下个月计划开始后端开发。整体进度符合预期。'
  },
  {
    speaker: '3',
    start_time: 19000,
    end_time: 23000,
    text: '我有一个关于技术架构的问题，我们使用什么数据库？'
  },
  {
    speaker: '2',
    start_time: 24000,
    end_time: 28500,
    text: '我们计划使用PostgreSQL作为主数据库，Redis做缓存。'
  },
  {
    speaker: '1',
    start_time: 29000,
    end_time: 31500,
    text: '很好，还有其他问题吗？'
  },
  {
    speaker: '3',
    start_time: 32000,
    end_time: 35500,
    text: '暂时没有了，谢谢大家。'
  }
];

// 测试说话人信息提取
console.log('\n📊 测试说话人信息提取...');
const speakerInfo = extractSpeakerInfo(mockUtterances);

console.log('\n🎯 提取结果:');
console.log('说话人数量:', speakerInfo.speaker_count);
console.log('摘要:', speakerInfo.summary);

console.log('\n👥 说话人详细统计:');
speakerInfo.speakers.forEach((speaker, index) => {
  const durationSec = Math.floor(speaker.total_duration / 1000);
  console.log(`  ${index + 1}. 说话人${speaker.id}:`);
  console.log(`     - 发言时长: ${durationSec}秒`);
  console.log(`     - 发言片段: ${speaker.segment_count}个`);
  console.log(`     - 文字数量: ${speaker.words_count}字`);
  console.log(`     - 首次出现: ${speaker.first_appear}ms`);
  console.log(`     - 最后出现: ${speaker.last_appear}ms`);
  console.log('');
});

console.log('🎭 对话流程:');
speakerInfo.segments.forEach((segment, index) => {
  const startSec = Math.floor(segment.start_time / 1000);
  const endSec = Math.floor(segment.end_time / 1000);
  console.log(`  ${index + 1}. [${startSec}s-${endSec}s] 说话人${segment.speaker}: ${segment.text}`);
});

console.log('\n📈 分析结果:');
console.log(`- 总片段数: ${speakerInfo.analysis.total_segments}`);
console.log(`- 检测到说话人: ${speakerInfo.analysis.speakers_detected}个`);
console.log(`- 主要说话人: ${speakerInfo.analysis.main_speaker}`);

// 测试空数据情况
console.log('\n\n🔬 测试边界情况...');
console.log('\n1. 空数据:');
const emptyResult = extractSpeakerInfo([]);
console.log('  说话人数量:', emptyResult.speaker_count);
console.log('  摘要:', emptyResult.summary);

// 测试单个说话人情况
console.log('\n2. 单个说话人:');
const singleSpeakerUtterances = [
  {
    speaker: '1',
    start_time: 0,
    end_time: 5000,
    text: '这是一个测试。'
  },
  {
    speaker: '1',
    start_time: 6000,
    end_time: 10000,
    text: '只有一个说话人的情况。'
  }
];
const singleSpeakerResult = extractSpeakerInfo(singleSpeakerUtterances);
console.log('  说话人数量:', singleSpeakerResult.speaker_count);
console.log('  摘要:', singleSpeakerResult.summary);

console.log('\n✅ 模拟测试完成!');