const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

// 测试环境变量（请根据实际情况设置）
const APP_KEY = process.env.APP_KEY || 'test-app-key';
const ACCESSKEY = process.env.ACCESSKEY || 'test-access-key';
const REGION = 'cn-beijing';
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://example.com/callback';

console.log('=== 编码诊断开始 ===');

// 1. 检查Node.js环境编码设置
function checkEnvironmentEncoding() {
    console.log('\n📋 1. 环境编码检查:');
    console.log('process.env.LANG:', process.env.LANG);
    console.log('process.env.LC_ALL:', process.env.LC_ALL);
    console.log('process.stdout.isTTY:', process.stdout.isTTY);
    console.log('process.platform:', process.platform);
    
    // 检查默认编码
    const testString = '测试中文字符串';
    console.log('原始中文字符串:', testString);
    console.log('字符串长度:', testString.length);
    console.log('字节长度:', Buffer.byteLength(testString, 'utf8'));
    console.log('Buffer表示:', Buffer.from(testString, 'utf8'));
    console.log('十六进制:', Buffer.from(testString, 'utf8').toString('hex'));
}

// 2. 测试JSON序列化中文处理
function testJSONSerialization() {
    console.log('\n📋 2. JSON序列化测试:');
    
    const testData = {
        transcript: '你好，这是一个测试转写结果。包含中文字符。',
        utterances: [
            {
                text: '你好',
                start_time: 0,
                end_time: 1000,
                speaker: '1',
                confidence: 0.95
            },
            {
                text: '这是一个测试',
                start_time: 1000,
                end_time: 3000,
                speaker: '1',
                confidence: 0.92
            }
        ],
        audio_info: {
            duration: 5000,
            format: 'webm'
        }
    };
    
    console.log('原始数据:', testData);
    
    const jsonString = JSON.stringify(testData);
    console.log('JSON序列化结果:', jsonString);
    console.log('JSON字节长度:', Buffer.byteLength(jsonString, 'utf8'));
    
    // 测试解析
    try {
        const parsed = JSON.parse(jsonString);
        console.log('解析后的transcript:', parsed.transcript);
        console.log('解析成功 ✅');
    } catch (error) {
        console.log('解析失败 ❌:', error.message);
    }
}

// 3. 测试HTTP请求头编码设置
function testHTTPHeaders() {
    console.log('\n📋 3. HTTP请求头测试:');
    
    const testData = {
        text: '测试中文内容',
        message: '这是一个包含中文的消息'
    };
    
    const postData = JSON.stringify(testData);
    console.log('POST数据:', postData);
    
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData, 'utf8'),
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
    };
    
    console.log('请求头设置:', headers);
    console.log('Content-Length计算:', Buffer.byteLength(postData, 'utf8'));
}

// 4. 模拟火山引擎API响应处理
function simulateVolcEngineResponse() {
    console.log('\n📋 4. 模拟火山引擎响应处理:');
    
    // 模拟API返回的数据
    const mockResponse = {
        statusCode: '20000000',
        message: '成功',
        data: {
            result: {
                text: '你好，欢迎使用语音转写服务。这是一个测试结果，包含中文字符。',
                utterances: [
                    {
                        text: '你好',
                        start_time: 0,
                        end_time: 1000,
                        speaker: '1',
                        confidence: 0.95
                    },
                    {
                        text: '欢迎使用语音转写服务',
                        start_time: 1000,
                        end_time: 3500,
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
    
    console.log('模拟响应数据:', JSON.stringify(mockResponse, null, 2));
    
    // 测试数据提取
    const result = {
        text: mockResponse.data.result.text,
        utterances: mockResponse.data.result.utterances,
        audio_info: mockResponse.data.audio_info
    };
    
    console.log('提取的结果:', result);
    console.log('转写文本:', result.text);
}

// 5. 测试回调数据编码
function testCallbackEncoding() {
    console.log('\n📋 5. 回调数据编码测试:');
    
    const recordingId = 'test-recording-123';
    const result = {
        text: '这是转写结果，包含中文字符。测试编码是否正确。',
        utterances: [
            {
                text: '这是转写结果',
                start_time: 0,
                end_time: 2000,
                speaker: '1'
            }
        ],
        audio_info: {
            duration: 3000
        }
    };
    
    const callbackData = {
        recordingId,
        transcript: result.text,
        utterances: result.utterances,
        audio_info: result.audio_info,
        error: null
    };
    
    console.log('回调数据对象:', callbackData);
    
    const postData = JSON.stringify(callbackData);
    console.log('序列化的回调数据:', postData);
    console.log('数据字节长度:', Buffer.byteLength(postData, 'utf8'));
    
    // 测试URL解析
    try {
        const url = new URL(CALLBACK_URL);
        console.log('回调URL解析:', {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname,
            protocol: url.protocol
        });
    } catch (error) {
        console.log('URL解析错误:', error.message);
    }
}

// 6. 检查控制台输出编码
function testConsoleOutput() {
    console.log('\n📋 6. 控制台输出测试:');
    
    const testStrings = [
        '简单中文',
        '包含特殊字符：！@#￥%……&*（）',
        '混合内容：Hello 你好 World 世界',
        '长文本：这是一个比较长的中文文本，用来测试在控制台输出时是否会出现乱码问题。包含各种标点符号：，。！？；：""\'\'（）【】',
        '数字混合：转写结果置信度为0.95，时长为3.5秒'
    ];
    
    testStrings.forEach((str, index) => {
        console.log(`测试字符串${index + 1}:`, str);
        console.log(`  - 长度: ${str.length}`);
        console.log(`  - 字节数: ${Buffer.byteLength(str, 'utf8')}`);
        console.log(`  - Buffer: ${Buffer.from(str, 'utf8').toString('hex').substring(0, 40)}...`);
    });
}

// 7. 文件编码检查
function checkFileEncoding() {
    console.log('\n📋 7. 文件编码检查:');
    
    // 检查当前文件的编码
    const fs = require('fs');
    const path = require('path');
    
    try {
        const filePath = path.join(__dirname, '..', 'tests', 'cloud_function_vocal.js');
        const fileBuffer = fs.readFileSync(filePath);
        
        console.log('文件路径:', filePath);
        console.log('文件大小:', fileBuffer.length, 'bytes');
        
        // 检查BOM
        const bom = fileBuffer.slice(0, 3);
        console.log('文件开头3字节:', bom.toString('hex'));
        
        if (bom.equals(Buffer.from([0xEF, 0xBB, 0xBF]))) {
            console.log('检测到UTF-8 BOM ✅');
        } else {
            console.log('未检测到UTF-8 BOM');
        }
        
        // 尝试以不同编码读取
        const utf8Content = fs.readFileSync(filePath, 'utf8');
        const firstLine = utf8Content.split('\n')[0];
        console.log('UTF-8读取首行:', firstLine);
        
    } catch (error) {
        console.log('文件读取错误:', error.message);
    }
}

// 运行所有诊断
async function runDiagnosis() {
    try {
        checkEnvironmentEncoding();
        testJSONSerialization();
        testHTTPHeaders();
        simulateVolcEngineResponse();
        testCallbackEncoding();
        testConsoleOutput();
        checkFileEncoding();
        
        console.log('\n=== 编码诊断完成 ===');
        console.log('请检查上述输出，看是否有乱码现象');
        console.log('如果看到乱码，请记录具体在哪个测试中出现');
        
    } catch (error) {
        console.error('诊断过程中出现错误:', error);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    runDiagnosis();
}

module.exports = {
    checkEnvironmentEncoding,
    testJSONSerialization,
    testHTTPHeaders,
    simulateVolcEngineResponse,
    testCallbackEncoding,
    testConsoleOutput,
    checkFileEncoding,
    runDiagnosis
};