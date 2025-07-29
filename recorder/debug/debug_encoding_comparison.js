const originalModule = require('../tests/cloud_function_vocal.js');
const fixedModule = require('./debug_encoding_fix.js');

console.log('=== 编码修复对比测试 ===');

// 模拟包含中文的HTTP响应数据
function simulateChineseResponse() {
    const testData = {
        statusCode: '20000000',
        message: '成功',
        data: {
            result: {
                text: '你好，这是一个语音转写测试。包含中文字符和标点符号：，。！？',
                utterances: [
                    {
                        text: '你好',
                        start_time: 0,
                        end_time: 1000,
                        speaker: '1',
                        confidence: 0.95
                    },
                    {
                        text: '这是一个语音转写测试',
                        start_time: 1000,
                        end_time: 4000,
                        speaker: '1',
                        confidence: 0.92
                    }
                ]
            },
            audio_info: {
                duration: 5000,
                sample_rate: 16000,
                channels: 1
            }
        }
    };
    
    return JSON.stringify(testData);
}

// 测试1: 模拟HTTP响应数据处理
function testHttpResponseHandling() {
    console.log('\n📋 测试1: HTTP响应数据处理');
    
    const responseData = simulateChineseResponse();
    console.log('模拟响应数据长度:', responseData.length, 'characters');
    console.log('UTF-8字节长度:', Buffer.byteLength(responseData, 'utf8'), 'bytes');
    
    // 模拟原版本的问题：直接字符串拼接
    console.log('\n🔴 原版本方式 (可能有问题):');
    let originalData = '';
    const chunks = [
        Buffer.from(responseData.substring(0, 100), 'utf8'),
        Buffer.from(responseData.substring(100, 200), 'utf8'),
        Buffer.from(responseData.substring(200), 'utf8')
    ];
    
    chunks.forEach((chunk, index) => {
        originalData += chunk; // 这里可能导致编码问题
        console.log(`  块${index + 1}: ${chunk.length} bytes -> 累计字符: ${originalData.length}`);
    });
    
    // 修复版本的方式：先合并Buffer再转换
    console.log('\n🟢 修复版本方式:');
    const fixedChunks = [];
    let totalLength = 0;
    
    chunks.forEach((chunk, index) => {
        fixedChunks.push(chunk);
        totalLength += chunk.length;
        console.log(`  块${index + 1}: ${chunk.length} bytes`);
    });
    
    const fixedBuffer = Buffer.concat(fixedChunks, totalLength);
    const fixedData = fixedBuffer.toString('utf8');
    
    console.log('  合并后总长度:', totalLength, 'bytes');
    console.log('  转换后字符数:', fixedData.length);
    
    // 比较结果
    console.log('\n📊 结果对比:');
    console.log('原版本数据长度:', originalData.length);
    console.log('修复版本数据长度:', fixedData.length);
    console.log('数据是否一致:', originalData === fixedData ? '✅' : '❌');
    
    if (originalData !== fixedData) {
        console.log('差异分析:');
        console.log('原版本前50字符:', originalData.substring(0, 50));
        console.log('修复版本前50字符:', fixedData.substring(0, 50));
    }
}

// 测试2: Content-Type头部对比
function testContentTypeHeaders() {
    console.log('\n📋 测试2: Content-Type头部对比');
    
    const testData = { message: '测试中文内容' };
    const postData = JSON.stringify(testData);
    
    console.log('测试数据:', testData);
    console.log('JSON字符串:', postData);
    console.log('字节长度:', Buffer.byteLength(postData, 'utf8'));
    
    // 原版本头部
    const originalHeaders = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    };
    
    // 修复版本头部
    const fixedHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData, 'utf8'),
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
    };
    
    console.log('\n🔴 原版本头部:', originalHeaders);
    console.log('🟢 修复版本头部:', fixedHeaders);
    
    console.log('\n📊 改进点:');
    console.log('✅ 添加了 charset=utf-8');
    console.log('✅ 明确指定了编码计算方式');
    console.log('✅ 添加了 Accept-Charset 头部');
}

// 测试3: JSON序列化中文处理
function testJSONSerialization() {
    console.log('\n📋 测试3: JSON序列化中文处理');
    
    const complexData = {
        recordingId: 'test-录音-123',
        transcript: '这是一个包含各种中文字符的转写结果：你好世界！测试特殊符号：￥、（）、【】',
        utterances: [
            {
                text: '你好世界',
                speaker: '说话人1',
                confidence: 0.95
            },
            {
                text: '测试特殊符号',
                speaker: '说话人2', 
                confidence: 0.88
            }
        ],
        metadata: {
            language: '中文',
            region: '北京',
            timestamp: new Date().toISOString()
        }
    };
    
    console.log('原始数据对象:', complexData);
    
    const jsonString = JSON.stringify(complexData);
    console.log('\nJSON序列化结果:');
    console.log('字符长度:', jsonString.length);
    console.log('UTF-8字节长度:', Buffer.byteLength(jsonString, 'utf8'));
    console.log('前100字符:', jsonString.substring(0, 100) + '...');
    
    // 测试解析
    try {
        const parsed = JSON.parse(jsonString);
        console.log('\n✅ JSON解析成功');
        console.log('解析后的transcript:', parsed.transcript);
        console.log('解析后的metadata.language:', parsed.metadata.language);
        
        // 验证中文字符完整性
        const originalText = complexData.transcript;
        const parsedText = parsed.transcript;
        console.log('\n🔍 中文字符完整性检查:');
        console.log('原始文本长度:', originalText.length);
        console.log('解析文本长度:', parsedText.length);
        console.log('文本是否一致:', originalText === parsedText ? '✅' : '❌');
        
    } catch (error) {
        console.log('❌ JSON解析失败:', error.message);
    }
}

// 测试4: Buffer处理对比
function testBufferHandling() {
    console.log('\n📋 测试4: Buffer处理对比');
    
    const testString = '测试中文字符串：你好世界！包含特殊符号：￥、（）';
    console.log('测试字符串:', testString);
    console.log('字符长度:', testString.length);
    console.log('UTF-8字节长度:', Buffer.byteLength(testString, 'utf8'));
    
    // 创建Buffer
    const buffer = Buffer.from(testString, 'utf8');
    console.log('\nBuffer信息:');
    console.log('Buffer长度:', buffer.length, 'bytes');
    console.log('Buffer十六进制:', buffer.toString('hex').substring(0, 50) + '...');
    
    // 测试不同的转换方式
    console.log('\n🔍 不同转换方式对比:');
    
    // 方式1: 直接toString()
    const method1 = buffer.toString();
    console.log('方式1 (默认):', method1.substring(0, 20) + '...');
    console.log('  长度:', method1.length);
    
    // 方式2: 明确指定utf8
    const method2 = buffer.toString('utf8');
    console.log('方式2 (utf8):', method2.substring(0, 20) + '...');
    console.log('  长度:', method2.length);
    
    // 方式3: 错误的ascii转换（演示问题）
    const method3 = buffer.toString('ascii');
    console.log('方式3 (ascii-错误):', method3.substring(0, 20) + '...');
    console.log('  长度:', method3.length);
    
    console.log('\n📊 结果分析:');
    console.log('方式1和2是否一致:', method1 === method2 ? '✅' : '❌');
    console.log('方式3是否有乱码:', method3.includes('?') || method3 !== testString ? '❌ 有乱码' : '✅');
}

// 运行所有测试
async function runAllTests() {
    try {
        testHttpResponseHandling();
        testContentTypeHeaders();
        testJSONSerialization();
        testBufferHandling();
        
        console.log('\n=== 测试总结 ===');
        console.log('✅ 所有编码测试完成');
        console.log('🔧 主要修复点:');
        console.log('  1. HTTP响应数据收集：使用Buffer数组而非字符串拼接');
        console.log('  2. Content-Type头部：添加charset=utf-8');
        console.log('  3. Content-Length计算：明确指定UTF-8编码');
        console.log('  4. 数据写入：确保以UTF-8编码写入');
        console.log('  5. 添加详细的编码日志用于调试');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    runAllTests();
}

module.exports = {
    testHttpResponseHandling,
    testContentTypeHeaders,
    testJSONSerialization,
    testBufferHandling,
    runAllTests
};