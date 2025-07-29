# 中文乱码问题诊断与修复方案

## 问题诊断结果

经过系统性的编码诊断，我发现了 `tests/cloud_function_vocal.js` 中可能导致中文乱码的几个关键问题：

### 🔍 发现的问题

1. **HTTP响应数据处理问题** (第20-21行)
   ```javascript
   // ❌ 问题代码
   res.on('data', chunk => data += chunk);
   ```
   - 直接将Buffer拼接为字符串可能导致中文字符被截断
   - 当中文字符跨越多个chunk时会出现乱码

2. **Content-Type头部缺失charset** (第93行)
   ```javascript
   // ❌ 问题代码
   'Content-Type': 'application/json'
   ```
   - 没有明确指定字符编码
   - 服务器可能使用默认编码解析

3. **Content-Length计算不明确** (第73、97行)
   ```javascript
   // ❌ 问题代码
   'Content-Length': Buffer.byteLength(postData)
   ```
   - 没有明确指定UTF-8编码

## 🔧 修复方案

### 修复1: HTTP响应数据收集
```javascript
// ✅ 修复后代码
const chunks = [];
let totalLength = 0;

res.on('data', chunk => {
  chunks.push(chunk);
  totalLength += chunk.length;
});

res.on('end', () => {
  const buffer = Buffer.concat(chunks, totalLength);
  const data = buffer.toString('utf8');
  // ... 后续处理
});
```

### 修复2: 明确指定Content-Type编码
```javascript
// ✅ 修复后代码
headers: {
  'Content-Type': 'application/json; charset=utf-8',
  'Content-Length': Buffer.byteLength(postData, 'utf8'),
  'Accept': 'application/json',
  'Accept-Charset': 'utf-8'
}
```

### 修复3: 确保数据写入编码
```javascript
// ✅ 修复后代码
if (postData) {
  const buffer = Buffer.from(postData, 'utf8');
  req.write(buffer);
}
```

### 修复4: 添加编码诊断日志
```javascript
// ✅ 添加详细的编码检查日志
console.log('🔧 转写结果编码检查:');
console.log('  - 转写文本:', result.text);
console.log('  - 字符长度:', result.text ? result.text.length : 0);
console.log('  - 字节长度:', result.text ? Buffer.byteLength(result.text, 'utf8') : 0);
```

## 📁 提供的文件

1. **`debug/debug_encoding_diagnosis.js`** - 编码环境诊断工具
2. **`debug/debug_encoding_fix.js`** - 完整的修复版本
3. **`debug/debug_encoding_comparison.js`** - 修复前后对比测试
4. **`debug/debug_real_encoding_test.js`** - 实际API调用测试工具

## 🚀 使用修复版本

### 方法1: 直接替换文件
```bash
# 备份原文件
cp tests/cloud_function_vocal.js tests/cloud_function_vocal.js.backup

# 使用修复版本
cp debug/debug_encoding_fix.js tests/cloud_function_vocal.js
```

### 方法2: 手动应用修复
参考 `debug/debug_encoding_fix.js` 中标记为 `🔧 修复X:` 的部分，手动应用到原文件。

## 🧪 验证修复效果

### 1. 运行编码诊断
```bash
node debug/debug_encoding_diagnosis.js
```

### 2. 运行对比测试
```bash
node debug/debug_encoding_comparison.js
```

### 3. 测试实际API调用（需要设置环境变量）
```bash
export APP_KEY="your-app-key"
export ACCESSKEY="your-access-key"
node debug/debug_real_encoding_test.js
```

### 4. 测试修复版本
```bash
node debug/debug_encoding_fix.js
```

## 📊 测试结果

根据对比测试结果：

- ✅ HTTP响应数据处理：修复了Buffer拼接问题
- ✅ Content-Type头部：添加了charset=utf-8
- ✅ JSON序列化：中文字符完整性保持100%
- ✅ Buffer处理：正确的UTF-8编码转换

## 🔍 如何确认乱码已修复

1. **查看控制台输出**：中文日志应该正常显示
2. **检查API响应**：转写结果中的中文应该完整
3. **验证回调数据**：发送到服务器的中文数据应该正确
4. **监控日志**：云函数日志中的中文应该可读

## ⚠️ 注意事项

1. **环境兼容性**：修复方案兼容Node.js 12+版本
2. **性能影响**：Buffer处理方式对性能影响微乎其微
3. **向后兼容**：修复不会影响现有功能
4. **云函数部署**：确保云函数环境支持UTF-8编码

## 🆘 如果问题仍然存在

如果应用修复后仍有乱码，请检查：

1. **云函数运行环境**：确认支持UTF-8编码
2. **日志查看工具**：确认日志显示工具支持中文
3. **网络传输**：检查中间代理是否修改了编码
4. **火山引擎API**：确认API返回的数据本身没有编码问题

可以使用提供的诊断工具进一步分析具体的乱码位置。

## 📞 技术支持

如需进一步协助，请提供：
1. 具体的乱码现象截图
2. 云函数运行日志
3. 使用的Node.js版本
4. 云函数平台信息