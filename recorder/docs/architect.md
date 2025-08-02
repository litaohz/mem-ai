# 录音转写系统架构

## 🎯 系统概述

一个基于 Node.js + 火山引擎的录音转写系统，支持实时录音、云存储、语音转文字和说话人识别。

## 📁 核心文件结构

```
recorder/
├── server.js                    # 主服务器
├── config/
│   ├── database.js             # SQLite 数据库配置
│   ├── tos-config.js           # TOS 云存储配置
│   └── volc-engine.example.js  # 火山引擎配置模板
├── lib/
│   ├── integrated-asr.js       # ASR 集成服务（含分包逻辑）
│   └── asr-polling.js          # 轮询服务
├── faas/
│   └── cloud_function_vocal.js # 云函数代码
├── public/                     # 前端文件
└── docs/                       # 文档目录
```

## 🔄 核心流程

```
用户录音 → 上传到TOS → 触发云函数 → 提交ASR → 轮询结果 → 保存转写
```

### 详细步骤
1. **录音上传**: 前端录音 → `POST /upload` → 保存本地 + 上传TOS
2. **云函数触发**: TOS事件 → 云函数 → 提交ASR任务 → 通知后端轮询
3. **结果轮询**: 每10秒查询ASR状态 → 完成后保存结果到数据库
4. **结果展示**: 前端获取录音列表和转写结果

## 🔧 关键技术实现

### 分包逻辑（重要优化）
- **触发条件**: 音频时长 > 60秒
- **分包策略**: 按1分钟时长分包
- **实现位置**: `lib/integrated-asr.js`
- **配置**: `CHUNK_CONFIG.TARGET_DURATION_SECONDS = 60`

### 状态管理
- `uploaded` → `polling` → `completed`/`failed`/`timeout`

### 数据库字段
- `recording_id`, `request_id`, `status`, `transcription`, `speaker_info`
- 分包支持: `is_chunked`, `total_chunks`, `chunk_info`

## 🌐 API 接口

| 接口 | 方法 | 功能 |
|------|------|------|
| `/upload` | POST | 录音文件上传 |
| `/api/start-polling` | POST | 启动轮询（云函数调用） |
| `/api/recordings` | GET | 获取录音列表 |
| `/api/recordings/:id` | GET | 获取录音详情 |
| `/api/tos-url/:id` | GET | 获取TOS预签名URL |

## ⚙️ 环境配置

```bash
# 火山引擎
VOLC_ACCESSKEY=your_access_key
VOLC_SECRETKEY=your_secret_key
TOS_BUCKET=your_bucket_name

# 服务器
PORT=3000
BACKEND_URL=http://localhost:3000
```

## 🔍 关键功能

### 说话人识别
- 自动检测说话人数量和时长
- 支持多说话人场景

### 云存储
- 自动上传到火山引擎TOS
- 预签名URL安全访问
- 本地+云端双重备份

### 错误处理
- 轮询超时保护（10分钟）
- 幂等性检查
- 完整状态跟踪

## 🚀 最新优化

### 分包优化（2025-02）
- **从文件大小分包改为时长分包**
- **优势**: 更均匀的分包，更好的ASR效果
- **配置**: 60秒/分包，最大20个分包

### 文档组织
- 所有文档移至 `docs/` 目录
- 创建文档索引和导航

## 🔧 开发要点

1. **分包逻辑**: 在 `integrated-asr.js` 中实现，基于FFmpeg音频分割
2. **轮询机制**: 异步处理，避免长时间等待
3. **云函数**: 处理TOS事件，提交ASR任务
4. **状态同步**: 通过数据库状态字段协调各组件

## 📊 性能指标

- 上传响应: < 2秒
- 轮询间隔: 10秒
- 最大处理时间: 10分钟
- 支持并发处理

---

*这是一个简化的架构文档，专为 Trae AI 记忆优化。详细实现请参考具体代码文件。*