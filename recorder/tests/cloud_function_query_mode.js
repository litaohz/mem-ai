/**
 * 云函数 - 查询模式ASR处理
 * 使用主动查询替代被动callback，提高可靠性
 */

const { createHash } = require('crypto');

// VolcEngine API配置
const API_CONFIG = {
    app_key: "7751295260",
    access_key: "xK79OY0V2KJpY2MhYWC7aW",
    secret_key: "V01ZMlNTM0dOalU1TUdReE5UWTRPRGswWkdWaFpEWTJOVFE0WldFNE56UTRZVFk9", // Base64编码
    bigmodel_submit_url: "https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit",
    bigmodel_query_url: "https://openspeech.bytedance.com/api/v3/auc/bigmodel/query",
    backend_url: "https://223afc8d9014.ngrok-free.app"
};

/**
 * 生成API签名
 */
function generateSignature(params, secretKey) {
    const sortedKeys = Object.keys(params).sort();
    const queryString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    return createHash('sha256').update(queryString + secretKey).digest('hex');
}

/**
 * 提交ASR任务（query模式）
 */
async function submitAsrTask(fileUrl, recordingId) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const params = {
        app_key: API_CONFIG.app_key,
        timestamp: timestamp,
        format: "webm",
        language: "zh-CN",
        use_itn: "True",
        use_disfluency: "True",
        max_speaker_num: 2,
        url: fileUrl,
        // 使用query模式，不设置callback_url
        // callback_url: "", // 注释掉callback
        // 添加标识信息便于追踪
        callback_data: JSON.stringify({
            recordingId: recordingId,
            mode: "query",
            timestamp: new Date().toISOString()
        })
    };
    
    const signature = generateSignature(params, API_CONFIG.secret_key);
    params.signature = signature;
    
    console.log('🚀 提交ASR任务 (Query模式)');
    console.log('📎 文件URL:', fileUrl);
    console.log('🆔 录音ID:', recordingId);
    
    try {
        const response = await fetch(API_CONFIG.bigmodel_submit_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(params)
        });
        
        const result = await response.json();
        console.log('📊 ASR提交结果:', JSON.stringify(result, null, 2));
        
        if (result.status_code === 1) {
            const requestId = result.request_id;
            console.log('✅ ASR任务提交成功');
            console.log('🆔 Request ID:', requestId);
            
            // 启动查询轮询
            await startPolling(requestId, recordingId);
            
            return { success: true, request_id: requestId };
        } else {
            throw new Error(`ASR任务提交失败: ${result.status_text}`);
        }
    } catch (error) {
        console.error('❌ ASR任务提交失败:', error);
        throw error;
    }
}

/**
 * 查询ASR结果
 */
async function queryAsrResult(requestId) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const params = {
        app_key: API_CONFIG.app_key,
        timestamp: timestamp,
        request_id: requestId
    };
    
    const signature = generateSignature(params, API_CONFIG.secret_key);
    params.signature = signature;
    
    try {
        const response = await fetch(API_CONFIG.bigmodel_query_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(params)
        });
        
        const result = await response.json();
        console.log(`🔍 查询结果 (${requestId}):`, JSON.stringify(result, null, 2));
        
        return result;
    } catch (error) {
        console.error('❌ 查询ASR结果失败:', error);
        throw error;
    }
}

/**
 * 启动轮询机制
 */
async function startPolling(requestId, recordingId) {
    console.log('⏰ 启动轮询机制');
    console.log('🆔 Request ID:', requestId);
    console.log('📝 Recording ID:', recordingId);
    
    const maxAttempts = 60; // 最多轮询60次
    const interval = 10000; // 每10秒查询一次
    let attempts = 0;
    
    const poll = async () => {
        attempts++;
        console.log(`🔄 第${attempts}次轮询查询 (${requestId})`);
        
        try {
            const result = await queryAsrResult(requestId);
            
            // 检查状态码
            if (result.status_code === 20000000) {
                // 成功完成
                console.log('🎉 ASR处理完成！');
                await sendResultToBackend(requestId, recordingId, result);
                return;
            } else if (result.status_code === 20000001) {
                // 还在处理中
                console.log('⏳ ASR任务还在处理中，继续等待...');
                
                if (attempts < maxAttempts) {
                    setTimeout(poll, interval);
                } else {
                    console.log('❌ 轮询超时，ASR任务可能失败');
                    await sendFailureToBackend(requestId, recordingId, '轮询超时');
                }
            } else {
                // 其他错误状态
                console.log('❌ ASR任务失败:', result.status_text);
                await sendFailureToBackend(requestId, recordingId, result.status_text);
            }
        } catch (error) {
            console.error('❌ 轮询查询失败:', error);
            
            if (attempts < maxAttempts) {
                console.log('🔄 查询失败，等待重试...');
                setTimeout(poll, interval);
            } else {
                await sendFailureToBackend(requestId, recordingId, '查询失败');
            }
        }
    };
    
    // 立即开始第一次查询
    poll();
}

/**
 * 发送成功结果到后端
 */
async function sendResultToBackend(requestId, recordingId, asrResult) {
    console.log('📤 发送转录结果到后端');
    
    const callbackData = {
        request_id: requestId,
        recordingId: recordingId,
        status_code: 3, // 成功状态
        status_text: "Success",
        utterances: asrResult.utterances || [],
        source: "query_mode",
        timestamp: new Date().toISOString()
    };
    
    try {
        const response = await fetch(`${API_CONFIG.backend_url}/api/transcription-callback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(callbackData)
        });
        
        if (response.ok) {
            console.log('✅ 结果已成功发送到后端');
        } else {
            console.error('❌ 发送结果到后端失败:', response.status, await response.text());
        }
    } catch (error) {
        console.error('❌ 发送结果到后端失败:', error);
    }
}

/**
 * 发送失败通知到后端
 */
async function sendFailureToBackend(requestId, recordingId, errorMessage) {
    console.log('📤 发送失败通知到后端');
    
    const callbackData = {
        request_id: requestId,
        recordingId: recordingId,
        status_code: 4, // 失败状态
        status_text: errorMessage,
        source: "query_mode",
        timestamp: new Date().toISOString()
    };
    
    try {
        const response = await fetch(`${API_CONFIG.backend_url}/api/transcription-callback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(callbackData)
        });
        
        if (response.ok) {
            console.log('✅ 失败通知已发送到后端');
        } else {
            console.error('❌ 发送失败通知到后端失败:', response.status);
        }
    } catch (error) {
        console.error('❌ 发送失败通知到后端失败:', error);
    }
}

/**
 * 云函数主入口
 * TOS事件触发后的处理逻辑
 */
exports.handler = async (event, context) => {
    console.log('🚀 云函数启动 - Query模式ASR处理');
    console.log('📥 接收到事件:', JSON.stringify(event, null, 2));
    
    try {
        // 解析TOS事件
        const record = event.Records[0];
        const bucket = record.s3.bucket.name;
        const objectKey = record.s3.object.key;
        const eventName = record.eventName;
        
        console.log('📂 存储桶:', bucket);
        console.log('📁 对象键:', objectKey);
        console.log('🎯 事件类型:', eventName);
        
        // 只处理对象创建事件
        if (!eventName.startsWith('s3:ObjectCreated:')) {
            console.log('⏭️ 非对象创建事件，跳过处理');
            return { statusCode: 200, body: 'Event ignored' };
        }
        
        // 构建文件URL
        const fileUrl = `https://${bucket}.tos-cn-beijing.volces.com/${objectKey}`;
        
        // 从objectKey提取recordingId
        const pathParts = objectKey.split('/');
        const recordingId = pathParts[pathParts.length - 2]; // 倒数第二个部分是recordingId
        
        console.log('🆔 提取的录音ID:', recordingId);
        console.log('🔗 文件URL:', fileUrl);
        
        // 提交ASR任务并启动轮询
        const result = await submitAsrTask(fileUrl, recordingId);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'ASR任务已提交，启动查询轮询',
                request_id: result.request_id,
                recording_id: recordingId,
                mode: 'query'
            })
        };
        
    } catch (error) {
        console.error('❌ 云函数处理失败:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                mode: 'query'
            })
        };
    }
};

/**
 * 测试函数
 */
async function testQueryMode() {
    console.log('🧪 测试Query模式ASR处理');
    
    // 使用最新的上传文件进行测试
    const testFileUrl = "https://bucket-bj-0720.tos-cn-beijing.volces.com/recordings/2025/07/6ec4fc6c-782a-4568-9ac3-1155e374bc29/6ec4fc6c-782a-4568-9ac3-1155e374bc29.webm";
    const testRecordingId = "6ec4fc6c-782a-4568-9ac3-1155e374bc29";
    
    try {
        await submitAsrTask(testFileUrl, testRecordingId);
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    testQueryMode();
}
