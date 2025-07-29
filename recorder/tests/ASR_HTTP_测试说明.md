# 火山引擎ASR HTTP API 测试说明

## 概述

这是一个使用纯HTTP方式调用火山引擎ASR服务的测试工具，不依赖任何SDK，完全基于官方文档的HTTP API接口实现。

## 文件说明

- `test-asr-http.js` - 主要测试文件
- `ASR.md` - 火山引擎ASR官方API文档
- 测试音频文件：`https://bucket-bj-0720.tos-cn-beijing.volces.com/bf1fe530-eb2f-42db-938b-f19e4d96a65a.webm`

## 配置要求

### 1. 获取火山引擎API密钥

您需要从火山引擎控制台获取以下信息：

- **APP KEY** (`X-Api-App-Key`)：应用ID
- **ACCESS KEY** (`X-Api-Access-Key`)：访问令牌

### 2. 配置方法

#### 方法一：环境变量配置（推荐）

复制 `env.example` 为 `.env` 文件：
```bash
cp env.example .env
```

编辑 `.env` 文件，设置您的API密钥：
```env
VOLC_APP_KEY=your_actual_app_key_here
VOLC_ACCESS_KEY=your_actual_access_key_here
```

#### 方法二：直接修改代码

编辑 `test-asr-http.js` 文件中的 `ASR_CONFIG` 配置：
```javascript
const ASR_CONFIG = {
  appKey: 'your_actual_app_key_here',
  accessKey: 'your_actual_access_key_here',
  // ... 其他配置
};
```

## 使用方法

### 1. 安装依赖

确保项目依赖已安装：
```bash
npm install
```

主要依赖：
- `axios` - HTTP请求库
- `uuid` - 生成请求ID
- `dotenv` - 环境变量支持

### 2. 运行测试

#### 完整测试流程
```bash
node test-asr-http.js
```

这将执行完整的ASR测试流程：
1. 提交音频文件进行识别
2. 轮询查询识别结果
3. 显示识别文本和详细信息

#### 作为模块使用

```javascript
const { submitAsrTask, queryAsrResult, pollAsrResult } = require('./test-asr-http');

// 提交任务
async function test() {
  const audioUrl = 'your_audio_url_here';
  
  // 1. 提交任务
  const submitResult = await submitAsrTask(audioUrl, {
    enable_itn: true,      // 启用文本规范化
    enable_punc: true,     // 启用标点符号
    show_utterances: true  // 显示分句信息
  });
  
  if (submitResult.success) {
    // 2. 查询结果
    const result = await pollAsrResult(submitResult.requestId);
    console.log('识别结果:', result.data?.result?.text);
  }
}
```

## API参数说明

### 音频配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `format` | string | "webm" | 音频容器格式 (raw/wav/mp3/ogg/webm) |
| `codec` | string | "opus" | 音频编码格式 (raw/opus) |
| `rate` | number | 16000 | 音频采样率 |
| `bits` | number | 16 | 音频采样点位数 |
| `channel` | number | 1 | 音频声道数 (1=单声道, 2=立体声) |

### 识别配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enable_itn` | boolean | true | 启用文本规范化 |
| `enable_punc` | boolean | false | 启用标点符号 |
| `enable_ddc` | boolean | false | 启用语义顺滑 |
| `enable_speaker_info` | boolean | false | 启用说话人分离 |
| `show_utterances` | boolean | true | 显示分句信息 |
| `vad_segment` | boolean | false | 使用VAD分句 |
| `end_window_size` | number | 1000 | 强制判停时间(ms) |

## 响应状态码

| 状态码 | 含义 | 说明 |
|--------|------|------|
| 20000000 | 成功 | 识别完成 |
| 20000001 | 正在处理中 | 任务处理中，需要继续查询 |
| 20000002 | 任务在队列中 | 任务排队中，需要继续查询 |
| 20000003 | 静音音频 | 音频内容为静音 |
| 45000001 | 请求参数无效 | 参数错误或缺失 |
| 45000002 | 空音频 | 音频文件为空 |
| 45000151 | 音频格式不正确 | 不支持的音频格式 |
| 550xxxx | 服务内部处理错误 | 服务器内部错误 |
| 55000031 | 服务器繁忙 | 服务过载，请稍后重试 |

## 示例输出

### 成功案例
```
🚀 开始火山引擎ASR HTTP API测试
==================================================
🎙️ 提交ASR任务...
Request ID: 67ee89ba-7050-4c04-a3d7-ac61a63499b3
音频URL: https://bucket-bj-0720.tos-cn-beijing.volces.com/bf1fe530-eb2f-42db-938b-f19e4d96a65a.webm

✅ 任务提交成功！

🔄 开始轮询查询结果，最大尝试次数: 30，间隔: 2000ms

--- 第 1 次查询 ---
⏳ 正在处理中...

--- 第 2 次查询 ---
✅ 识别成功！

==================================================
🏁 测试完成

📝 识别文本:
这是字节跳动，今日头条母公司。

📋 详细分句信息:
1. [0ms-1705ms] 这是字节跳动，
2. [2110ms-3696ms] 今日头条母公司。

🎵 音频信息:
时长: 3696ms
```

## 故障排除

### 1. 配置问题
- 确保APP KEY和ACCESS KEY正确配置
- 检查网络连接是否正常
- 确认音频文件URL可以正常访问

### 2. 音频格式问题
- 支持的格式：raw, wav, mp3, ogg, webm
- 推荐参数：16kHz采样率，16bit，单声道
- 确保音频文件不为空且不是静音

### 3. 服务器错误
- 55000031错误：服务过载，请稍后重试
- 45000151错误：音频格式不正确，检查format和codec参数
- 45000001错误：请求参数无效，检查请求体格式

### 4. 超时问题
- 增加轮询次数：修改`maxAttempts`参数
- 增加查询间隔：修改`interval`参数
- 检查音频文件大小，大文件需要更长处理时间

## 技术细节

### HTTP请求头
```
Content-Type: application/json
X-Api-App-Key: {您的APP KEY}
X-Api-Access-Key: {您的ACCESS KEY}
X-Api-Resource-Id: volc.bigasr.auc
X-Api-Request-Id: {UUID任务ID}
X-Api-Sequence: -1
```

### 提交任务API
- **URL**: `https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit`
- **方法**: POST
- **请求体**: JSON格式的音频和配置信息

### 查询结果API
- **URL**: `https://openspeech.bytedance.com/api/v3/auc/bigmodel/query`
- **方法**: POST
- **请求体**: 空JSON `{}`
- **通过Header中的Request-Id标识任务**

## 参考文档

- [火山引擎ASR官方文档](https://www.volcengine.com/docs/6561/1354868)
- [ASR.md](./ASR.md) - 本地文档副本 