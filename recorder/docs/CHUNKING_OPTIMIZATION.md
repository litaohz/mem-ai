# 分包逻辑优化：从文件大小到时长分包

## 🎯 优化目标

将音频分包逻辑从基于文件大小的阈值改为基于时长的阈值（1分钟），以实现更均匀和可预测的分包效果。

## 📊 优化前后对比

### 优化前（基于文件大小）
- **阈值**: 200KB
- **问题**: 
  - 不同音质的音频文件，相同大小对应的时长差异很大
  - 压缩率不同导致分包时长不均匀
  - 难以预测每个分包的实际播放时长

### 优化后（基于时长）
- **阈值**: 60秒（1分钟）
- **优势**:
  - 每个分包的时长固定，便于ASR处理
  - 更均匀的分包，提高转写质量
  - 便于进度跟踪和用户体验

## 🔧 技术实现

### 1. 配置修改

```javascript
// 原配置
const CHUNK_CONFIG = {
  TARGET_SIZE_KB: 200, // 200KB for testing
  MAX_CHUNKS: 20,
  CHUNK_DIR: path.join(__dirname, '../chunks')
};

// 新配置
const CHUNK_CONFIG = {
  TARGET_DURATION_SECONDS: 60, // 1分钟分包
  MAX_CHUNKS: 20,
  CHUNK_DIR: path.join(__dirname, '../chunks')
};
```

### 2. 分包计算逻辑

```javascript
// 原逻辑：基于文件大小计算分包时长
function calculateChunkDurations(totalDuration, totalSizeKB, targetSizeKB) {
  const chunkDuration = (totalDuration * targetSizeKB) / totalSizeKB;
  // ...
}

// 新逻辑：基于固定时长分包
function calculateChunkDurations(totalDuration, targetDurationSeconds) {
  const totalChunks = Math.ceil(totalDuration / targetDurationSeconds);
  // ...
}
```

### 3. 分包判断条件

```javascript
// 原判断：基于文件大小
if (parseFloat(audioInfo.sizeKB) <= CHUNK_CONFIG.TARGET_SIZE_KB) {
  console.log(`📦 文件小于${CHUNK_CONFIG.TARGET_SIZE_KB}KB，无需分包`);
  // ...
}

// 新判断：基于时长
if (audioInfo.duration <= CHUNK_CONFIG.TARGET_DURATION_SECONDS) {
  console.log(`📦 文件时长${audioInfo.duration}s，小于${CHUNK_CONFIG.TARGET_DURATION_SECONDS}s，无需分包`);
  // ...
}
```

## 📁 修改的文件

1. **lib/integrated-asr.js**
   - 修改 `CHUNK_CONFIG` 配置
   - 更新 `calculateChunkDurations` 函数
   - 修改 `chunkAudioFile` 函数中的判断逻辑

2. **docs/architect.md**
   - 更新分包策略说明
   - 修改流程图描述
   - 更新配置示例

3. **test_duration_chunking.js** (新增)
   - 测试脚本，验证新的分包逻辑

## 🧪 测试方法

运行测试脚本验证新的分包逻辑：

```bash
node test_duration_chunking.js
```

## 📈 预期效果

1. **更均匀的分包**: 每个分包都是1分钟时长（最后一个分包可能小于1分钟）
2. **更好的ASR效果**: 固定时长有利于语音识别模型的处理
3. **更好的用户体验**: 可预测的处理时间和进度
4. **更简单的逻辑**: 不需要考虑音频编码和压缩率的影响

## 🔄 兼容性

- 保持原有的API接口不变
- 现有的数据库结构无需修改
- 云函数处理逻辑无需调整

## 📝 注意事项

1. 确保FFmpeg已正确安装，用于音频分割
2. 分包文件仍然存储在 `chunks/{recordingId}/` 目录下
3. 最大分包数限制仍为20个，防止过度分包
4. 对于时长小于1分钟的音频，不进行分包处理

## 🚀 部署建议

1. 在测试环境验证新逻辑的正确性
2. 监控分包后的文件大小，确保不超过ASR服务限制
3. 观察转写质量是否有改善
4. 根据实际使用情况调整时长阈值（如需要）