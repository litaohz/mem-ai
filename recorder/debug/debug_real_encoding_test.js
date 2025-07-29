const https = require('https');
const { v4: uuidv4 } = require('uuid');

// 从环境变量读取（请确保设置了正确的值）
const APP_KEY = process.env.APP_KEY;
const ACCESSKEY = process.env.ACCESSKEY;
const REGION = 'cn-beijing';

console.log('=== 实际环境编码测试 ===');

// 检查环境变量是否设置
if (!APP_KEY || !ACCESSKEY) {
    console.log('⚠️  请先设置环境变量 APP_KEY 和 ACCESSKEY');
    console.log('示例：');
    console.log('export APP_KEY="your-app-key"');
    console.log('export ACCESSKEY="your-access-key"');
    process.exit(1);
}

// 发送HTTP请求的函数（带详细日志）
function makeHttpRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        console.log('\n📤 发送请求:');
        console.log('主机:', options.hostname);
        console.log('路径:', options.path);
        console.log('方法:', options.method);
        console.log('请求头:', JSON.stringify(options.headers, null, 2));
        
        if (postData) {
            console.log('请求体长度:', Buffer.byteLength(postData, 'utf8'), 'bytes');
            console.log('请求体内容:', postData);
            console.log('请求体十六进制:', Buffer.from(postData, 'utf8').toString('hex').substring(0, 100) + '...');
        }
        
        const req = https.request(options, res => {
            console.log('\n📥 收到响应:');
            console.log('状态码:', res.statusCode);
            console.log('响应头:', JSON.stringify(res.headers, null, 2));
            
            let data = '';
            let chunks = [];
            
            res.on('data', chunk => {
                chunks.push(chunk);
                data += chunk;
                console.log('收到数据块:', chunk.length, 'bytes');
            });
            
            res.on('end', () => {
                console.log('\n📋 响应完成:');
                console.log('总数据长度:', data.length, 'characters');
                console.log('总字节长度:', Buffer.byteLength(data, 'utf8'), 'bytes');
                
                // 检查原始字节数据
                const fullBuffer = Buffer.concat(chunks);
                console.log('原始响应字节:', fullBuffer.toString('hex').substring(0, 200) + '...');
                
                // 尝试不同编码解析
                console.log('\n🔍 编码测试:');
                console.log('UTF-8解析:', fullBuffer.toString('utf8').substring(0, 200) + '...');
                console.log('ASCII解析:', fullBuffer.toString('ascii').substring(0, 200) + '...');
                
                try {
                    const parsed = JSON.parse(data);
                    console.log('\n✅ JSON解析成功');
                    
                    // 检查特定字段的编码
                    if (parsed.data && parsed.data.result && parsed.data.result.text) {
                        const text = parsed.data.result.text;
                        console.log('转写文本:', text);
                        console.log('文本长度:', text.length);
                        console.log('文本字节数:', Buffer.byteLength(text, 'utf8'));
                        console.log('文本十六进制:', Buffer.from(text, 'utf8').toString('hex').substring(0, 100) + '...');
                    }
                    
                    if (parsed.message) {
                        console.log('响应消息:', parsed.message);
                        console.log('消息编码:', Buffer.from(parsed.message, 'utf8').toString('hex'));
                    }
                    
                } catch (parseError) {
                    console.log('❌ JSON解析失败:', parseError.message);
                    console.log('原始数据:', data.substring(0, 500) + '...');
                }
                
                const result = {
                    statusCode: res.headers['x-api-status-code'] || res.statusCode,
                    message: res.headers['x-api-message'] || 'No message',
                    logid: res.headers['x-tt-logid'],
                    data: data ? JSON.parse(data) : {},
                    rawData: data
                };
                
                resolve(result);
            });
        });
        
        req.on('error', error => {
            console.error('❌ 请求错误:', error);
            reject(error);
        });
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// 统一请求函数
async function request(method, path, body = {}, requestId = null) {
    const postData = JSON.stringify(body);
    
    console.log('\n🔧 准备请求数据:');
    console.log('请求体对象:', JSON.stringify(body, null, 2));
    console.log('序列化后:', postData);
    console.log('字节长度:', Buffer.byteLength(postData, 'utf8'));
    
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Api-App-Key': APP_KEY,
        'X-Api-Access-Key': ACCESSKEY,
        'X-Api-Resource-Id': 'volc.bigasr.auc',
        'Content-Length': Buffer.byteLength(postData, 'utf8'),
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
    };
    
    if (requestId) {
        headers['X-Api-Request-Id'] = requestId;
        headers['X-Api-Sequence'] = '-1';
    }
    
    const options = {
        hostname: 'openspeech.bytedance.com',
        path,
        method,
        headers
    };
    
    return makeHttpRequest(options, postData);
}

// 测试实际API调用
async function testRealAPI() {
    try {
        console.log('\n🚀 开始实际API测试...');
        
        // 生成测试请求ID
        const requestId = uuidv4();
        console.log('请求ID:', requestId);
        
        // 使用一个测试音频URL（请替换为实际的音频文件URL）
        const testAudioUrl = 'https://bucket-bj-0720.tos-cn-beijing.volces.com/bf1fe530-eb2f-42db-938b-f19e4d96a65a.webm';
        
        console.log('测试音频URL:', testAudioUrl);
        
        // 提交任务
        const submitRes = await request('POST', '/api/v3/auc/bigmodel/submit', {
            user: { uid: 'test-user-' + Date.now() },
            audio: {
                format: 'webm',
                url: testAudioUrl,
                codec: 'opus',
                rate: 16000,
                bits: 16,
                channel: 1
            },
            request: {
                model_name: 'bigmodel',
                enable_speaker_info: true,
                enable_punc: true,
                enable_itn: true,
                show_utterances: true
            }
        }, requestId);
        
        console.log('\n📊 提交结果分析:');
        console.log('状态码:', submitRes.statusCode);
        console.log('消息:', submitRes.message);
        console.log('日志ID:', submitRes.logid);
        
        if (submitRes.statusCode !== '20000000') {
            console.log('❌ 任务提交失败，无法继续测试查询');
            return;
        }
        
        console.log('✅ 任务提交成功，开始查询...');
        
        // 等待一段时间后查询
        await new Promise(r => setTimeout(r, 5000));
        
        const queryRes = await request('POST', '/api/v3/auc/bigmodel/query', {}, requestId);
        
        console.log('\n📊 查询结果分析:');
        console.log('状态码:', queryRes.statusCode);
        console.log('消息:', queryRes.message);
        
        if (queryRes.data && queryRes.data.result) {
            const result = queryRes.data.result;
            console.log('\n🎯 转写结果详细分析:');
            
            if (result.text) {
                console.log('转写文本:', result.text);
                console.log('文本类型:', typeof result.text);
                console.log('文本长度:', result.text.length);
                console.log('字节长度:', Buffer.byteLength(result.text, 'utf8'));
                
                // 逐字符分析
                console.log('\n🔍 逐字符分析:');
                for (let i = 0; i < Math.min(result.text.length, 10); i++) {
                    const char = result.text[i];
                    const code = char.charCodeAt(0);
                    const hex = Buffer.from(char, 'utf8').toString('hex');
                    console.log(`字符${i}: "${char}" Unicode:${code} Hex:${hex}`);
                }
            }
            
            if (result.utterances && result.utterances.length > 0) {
                console.log('\n📝 分句分析:');
                result.utterances.forEach((utterance, index) => {
                    console.log(`分句${index}:`, utterance.text);
                    console.log(`  字节长度:`, Buffer.byteLength(utterance.text, 'utf8'));
                });
            }
        }
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error);
        console.error('错误堆栈:', error.stack);
    }
}

// 运行测试
if (require.main === module) {
    testRealAPI();
}

module.exports = { testRealAPI, request, makeHttpRequest };