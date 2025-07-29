# 🎤 ASR说话人识别功能测试

这个目录包含用于测试火山引擎ASR说话人识别功能的测试脚本。

## 测试文件

- `test_asr_with_speaker_info.js` - 测试ASR的说话人识别功能（需要火山引擎API访问权限）
- `test_mock_speaker_recognition.js` - 使用模拟数据测试说话人识别功能（无需API访问权限）
- `test_audio_file.js` - 检查音频文件的有效性和格式
- `run_test.bat` - Windows环境下运行测试的批处理脚本

## 使用方法

### 前提条件

1. 确保已设置以下环境变量：
   - `APP_KEY` - 火山引擎应用密钥
   - `ACCESSKEY` - 火山引擎访问密钥

   可以通过创建`.env`文件或直接设置环境变量来配置。

2. 准备测试音频文件（如`1753784804508-12235786.webm`），并将其放置在项目的 `uploads/` 目录中

### 运行测试

#### 第0步：检查uploads目录

```bash
# 检查uploads目录和音频文件
node tests/speaker_recognition_test/check_uploads.js
```

#### 方法1：使用批处理脚本（Windows）

```bash
# 切换到测试目录
cd tests\speaker_recognition_test

# 运行测试脚本，指定测试音频文件
run_test.bat 1753784804508-12235786.webm
```

#### 方法2：直接使用Node.js

```bash
# 切换到项目根目录
cd recorder

# 检查uploads目录和音频文件
node tests/speaker_recognition_test/check_uploads.js

# 检查音频文件（自动在uploads目录中查找）
node tests/speaker_recognition_test/test_audio_file.js 1753784804508-12235786.webm

# 使用模拟数据测试（无需API访问权限）
node tests/speaker_recognition_test/test_mock_speaker_recognition.js

# 使用实际API测试（需要API访问权限，自动在uploads目录中查找）
node tests/speaker_recognition_test/test_asr_with_speaker_info.js 1753784804508-12235786.webm
```

## 测试结果

测试脚本会输出以下信息：

1. 测试文件信息
2. ASR任务提交结果
3. 轮询过程
4. 转录文本
5. 说话人识别结果
   - 说话人数量
   - 每个说话人的详细信息（发言时长、片段数等）
   - 对话流程（按时间顺序）

## 调试

测试脚本会将完整的ASR响应保存到`asr_response_debug.json`文件中，可以用于进一步分析和调试。

## 注意事项

- 测试脚本默认轮询30次，每次间隔5秒，总共最多等待2.5分钟
- 如果音频文件较大，处理时间可能会更长
- 确保网络连接稳定，以便与火山引擎API通信