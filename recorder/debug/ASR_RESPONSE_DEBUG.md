# ASR 响应调试系统

## 概述
为了更好地调试ASR服务的响应数据，我们添加了完整的响应记录功能。

## 文件说明

### 1. `asr_response_debug.json`
- **用途**: 存储所有ASR响应的完整数据
- **结构**: 
  ```json
  {
    "responses": [
      {
        "timestamp": "2025-07-29T...",
        "recording_id": "录音ID",
        "request_id": "请求ID", 
        "full_response": "完整的ASR响应对象",
        "response_size": "响应大小(字节)"
      }
    ],
    "last_updated": "最后更新时间"
  }
  ```
- **容量管理**: 自动保留最近100条记录

### 2. `debug_asr_response.js`
- **用途**: 分析和查看调试数据的工具
- **功能**:
  - 统计响应状态码分布
  - 分析响应消息类型
  - 查看特定录音的响应
  - 清理旧数据

## 使用方法

### 查看整体分析
```bash
node debug/debug_asr_response.js analyze
```

### 查看特定录音的响应
```bash
node debug/debug_asr_response.js get <recordingId>
```

### 清理旧数据
```bash
node debug/debug_asr_response.js cleanup [保留条数]
```

## 修改说明

### `lib/asr-polling.js` 的变更:
1. 添加了 `fs` 和 `path` 模块导入
2. 新增 `saveAsrResponseToDebugFile()` 函数
3. 在轮询过程中自动保存所有ASR响应（成功和失败都保存）

## 调试流程

1. **运行录音转录**: 正常使用ASR服务
2. **查看调试数据**: 运行 `node debug/debug_asr_response.js analyze`
3. **分析特定问题**: 使用 `get` 命令查看具体录音的完整响应
4. **定期清理**: 使用 `cleanup` 命令管理文件大小

## 注意事项

- 调试文件会自动创建，无需手动初始化
- 系统会自动处理文件读写错误
- 响应数据包含完整的headers和body信息
- 适合用于分析ASR服务的各种状态和错误情况

## 示例输出

```
📊 ASR响应调试数据分析
==================================================
总响应数量: 15
最后更新时间: 2025-07-29T10:30:00.000Z

📈 状态码分布:
  20000000: 10次 (成功)
  20000001: 3次  (处理中)
  20000002: 2次  (队列中)

💬 消息分布:
  success: 10次
  processing: 3次
  in queue: 2次

📏 平均响应大小: 1524 bytes
```
