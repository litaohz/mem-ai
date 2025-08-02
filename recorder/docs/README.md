# 录音转写系统文档

欢迎来到录音转写系统的文档中心。这里包含了系统的完整技术文档和使用指南。

## 📚 文档目录

### 核心架构文档
- **[architect.md](./architect.md)** - 系统架构设计文档
  - 主流程架构图
  - 系统组件说明
  - 数据流详解
  - 部署架构
  - TOS上传实现详解

### 功能特性文档
- **[SPEAKER_RECOGNITION.md](./SPEAKER_RECOGNITION.md)** - 说话人识别功能文档
  - 说话人识别原理
  - 实现细节
  - 使用方法

### 优化改进文档
- **[CHUNKING_OPTIMIZATION.md](./CHUNKING_OPTIMIZATION.md)** - 分包逻辑优化文档
  - 从文件大小到时长分包的优化
  - 技术实现细节
  - 测试方法

### 产品需求文档
- **[prd.md](./prd.md)** - 产品需求文档
  - 功能需求
  - 技术要求
  - 用户场景

## 🚀 快速开始

1. 首先阅读 [architect.md](./architect.md) 了解系统整体架构
2. 查看 [CHUNKING_OPTIMIZATION.md](./CHUNKING_OPTIMIZATION.md) 了解最新的分包优化
3. 如需了解说话人识别功能，参考 [SPEAKER_RECOGNITION.md](./SPEAKER_RECOGNITION.md)

## 📝 文档维护

- 所有文档都应保持最新状态
- 新功能开发时需要同步更新相关文档
- 重大架构变更需要更新 architect.md

## 🔗 相关链接

- [项目根目录 README](../README.md)
- [测试脚本](../test_duration_chunking.js)
- [配置文件](../config/)
- [源代码](../lib/)

---

*最后更新: 2025-02-08*