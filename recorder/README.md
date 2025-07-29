# 🌹 Rose Voice - 可爱的录音转写助手

一个具有 Excalidraw 风格可爱 UI 的录音转写 Web 应用，基于 Node.js 和火山引擎 ASR 服务，支持自动上传到火山引擎TOS云存储。

![Rose Voice](https://img.shields.io/badge/Rose%20Voice-v1.0.0-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-v18+-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ 特性

- 🎨 **可爱的 UI 设计** - 受 Excalidraw 启发的手绘风格界面
- 🎙️ **实时录音** - 支持网页端直接录音功能
- 🗣️ **智能转写** - 基于火山引擎 ASR 的语音转文字
- ☁️ **云端存储** - 自动上传到火山引擎 TOS 对象存储
- 📚 **历史管理** - 完整的录音历史记录和搜索功能
- 🎧 **在线播放** - 支持本地和云端音频播放
- 💾 **导出功能** - 支持文本下载和复制
- 📱 **响应式设计** - 完美适配各种设备

## 🚀 快速开始

### 前置要求

- Node.js 18+ 
- npm 或 yarn
- 已配置的火山引擎账户（包含TOS服务）

### 安装步骤

1. **克隆项目**
```bash
git clone <your-repo-url>
cd recorder
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入您的火山引擎配置
VOLC_ACCESSKEY=your_access_key_here
VOLC_SECRETKEY=your_secret_key_here
TOS_BUCKET=your_bucket_name
```

4. **启动开发服务器**
```bash
npm run dev
# 或者
npm start
```

5. **访问应用**
打开浏览器访问: http://localhost:3000

## 📁 项目结构

```
recorder/
├── 📄 server.js              # Express 服务器
├── 📄 package.json           # 项目配置
├── 📄 .env.example          # 环境变量模板
├── 📄 prd.md               # 产品需求文档
├── 📁 config/              # 配置文件
│   └── 📄 tos-config.js    # TOS 配置和功能
├── 📁 public/              # 前端静态文件
│   ├── 📄 index.html       # 主页面
│   ├── 📄 style.css        # Excalidraw 风格样式
│   └── 📄 app.js           # 前端 JavaScript
├── 📁 uploads/             # 本地文件存储 (自动创建)
└── 📄 recordings.db        # SQLite 数据库 (自动创建)
```

## ☁️ TOS 云存储配置

### 火山引擎 TOS 设置

1. **创建存储桶**
   - 登录火山引擎控制台
   - 进入 TOS 服务
   - 创建新的存储桶，建议命名为 `rose-voice-recordings`

2. **获取访问密钥**
   - 前往访问控制 (IAM) 页面
   - 创建或使用现有的 AccessKey

3. **配置环境变量**
   ```env
   VOLC_ACCESSKEY=your_access_key_id
   VOLC_SECRETKEY=your_secret_access_key
   TOS_BUCKET=rose-voice-recordings
   ```

### 云存储功能

- **自动上传**: 录音文件自动上传到 TOS
- **智能播放**: 优先从云端播放，本地文件作为备份
- **状态显示**: 实时显示上传状态（等待/上传中/已完成/失败）
- **预签名URL**: 安全的临时访问链接
- **备份策略**: 本地和云端双重保障

## 🔧 配置说明

### 环境变量详解

```env
# 必须配置（火山引擎账户信息）
VOLC_ACCESSKEY=your_access_key          # 火山引擎 AccessKey ID
VOLC_SECRETKEY=your_secret_key          # 火山引擎 Secret Access Key
TOS_BUCKET=rose-voice-recordings        # TOS 存储桶名称

# 可选配置
PORT=3000                               # 应用端口
```

### TOS 配置参数

```javascript
// config/tos-config.js 中的配置
{
  region: 'cn-beijing',                 // TOS 区域
  endpoint: 'tos-s3-cn-beijing.volces.com',  // TOS 端点
  bucket: 'rose-voice-recordings'       // 存储桶名称
}
```

## 🎯 功能说明

### 🎙️ 实时录音
- 网页端直接录音功能
- 音频预览和重新录制
- 实时录音时长显示
- 支持音频格式：WebM
- **录音完成后自动上传到TOS云存储**

### ☁️ 云存储管理
- 录音文件自动上传到火山引擎 TOS
- 上传状态实时显示：⏳等待 📤上传中 ☁️已完成 ❌失败
- 云端文件的预签名URL访问
- 本地备份 + 云端存储的双重保障

### 🔍 历史搜索
- 按文件名搜索
- 按转写内容搜索
- 实时搜索结果高亮
- 云存储状态显示

### 🎵 录音详情
- 优先从云端播放音频
- 转写状态显示
- 云存储状态显示
- 转写内容查看
- 文本下载和复制

## �️ 开发指南

### TOS功能测试

1. **测试上传功能**
```bash
# 录制一段音频，检查控制台日志
# 应该看到类似输出：
# � 开始上传文件到TOS: 录音_2024-01-01T10-00-00.webm
# ✅ TOS上传成功: 录音_2024-01-01T10-00-00.webm
```

2. **检查存储桶**
- 登录火山引擎控制台
- 查看 TOS 存储桶中的文件
- 文件路径格式：`recordings/YYYY/MM/recording-id/filename.webm`

3. **测试播放功能**
- 从录音列表打开已完成的录音
- 音频播放器应该从云端加载音频

## 📋 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/upload` | POST | 上传音频文件（自动上传到TOS） |
| `/api/recordings` | GET | 获取录音列表（包含TOS状态） |
| `/api/recordings/:id` | GET | 获取录音详情 |
| `/api/audio/:filename` | GET | 播放本地音频文件 |
| `/api/tos-url/:id` | GET | 获取TOS文件的预签名URL |
| `/api/download/:id` | GET | 下载转写文本 |

## � 部署建议

### 生产环境部署

1. **服务器配置**
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name "rose-voice"

# 配置自动重启
pm2 startup
pm2 save
```

2. **环境变量安全**
```bash
# 使用环境变量而不是 .env 文件
export VOLC_ACCESSKEY="your_real_access_key"
export VOLC_SECRETKEY="your_real_secret_key"
export TOS_BUCKET="production_bucket_name"
```

3. **TOS权限配置**
- 确保 AccessKey 具有对应存储桶的读写权限
- 建议使用 IAM 策略限制权限范围
- 定期轮换访问密钥

## 🔒 安全性

- **文件验证**: 严格的音频文件类型检查
- **大小限制**: 100MB 文件上传限制
- **访问控制**: TOS 预签名 URL 临时访问
- **环境变量**: 敏感信息通过环境变量配置
- **SQL 注入**: 参数化查询防护
- **XSS 防护**: 输入验证和转义

## 🎯 后续开发计划

- [ ] 集成真实火山引擎 ASR API
- [x] 自动上传到火山引擎 TOS
- [ ] TOS文件生命周期管理
- [ ] 添加说话人分离功能
- [ ] 支持多种音频格式
- [ ] 添加用户系统
- [ ] 支持批量操作
- [ ] 小程序版本迁移

## ⚠️ 注意事项

1. **首次使用前请配置环境变量**，否则TOS上传功能将失败
2. **确保TOS存储桶已创建**且AccessKey具有相应权限
3. **网络连接**需要能够访问火山引擎TOS服务
4. **成本控制**：注意TOS的存储和流量费用

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🙏 致谢

- 设计灵感来自 [Excalidraw](https://excalidraw.com/)
- 转写服务基于火山引擎 ASR
- 云存储基于火山引擎 TOS
- UI 图标来自 Emoji

---

**🌹 享受你的 Rose Voice 录音转写之旅！** 现在支持云端存储，数据更安全！ 