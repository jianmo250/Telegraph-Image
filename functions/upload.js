// functions/upload.js

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const formData = await request.formData();
        const uploadFile = formData.get('file');

        if (!uploadFile) {
            throw new Error('No file uploaded');
        }

        const fileName = uploadFile.name || "file";
        const fileExtension = fileName.split('.').pop().toLowerCase() || "jpg";

        // 构造发送给 Telegram Bot 的请求
        const telegramFormData = new FormData();
        telegramFormData.append("chat_id", env.TG_Chat_ID);

        // 根据文件类型选择 API
        let apiEndpoint = 'sendDocument'; // 默认 fallback
        if (uploadFile.type.startsWith('image/')) {
            telegramFormData.append("photo", uploadFile);
            apiEndpoint = 'sendPhoto';
        } else if (uploadFile.type.startsWith('video/')) {
            telegramFormData.append("video", uploadFile);
            apiEndpoint = 'sendVideo';
        } else if (uploadFile.type.startsWith('audio/')) {
            telegramFormData.append("audio", uploadFile);
            apiEndpoint = 'sendAudio';
        } else {
            telegramFormData.append("document", uploadFile);
        }

        // 发送给 Telegram
        const result = await sendToTelegram(telegramFormData, apiEndpoint, env);

        if (!result.success) {
            throw new Error(result.error);
        }

        // 获取 File ID
        const fileId = getFileId(result.data);
        if (!fileId) {
            throw new Error('Failed to get file ID from Telegram response');
        }

        // === 关键：写入 Cloudflare KV 数据库 ===
        // 如果你没有绑定 KV，这一步会跳过，但建议绑定以支持文件名记录
        if (env.img_url) {
            await env.img_url.put(`${fileId}.${fileExtension}`, "", {
                metadata: {
                    TimeStamp: Date.now(),
                    fileName: fileName,
                    fileSize: uploadFile.size,
                    fileType: uploadFile.type
                }
            });
        }

        // 返回前端需要的格式
        // 这里的路径 /file/xxx 对应我们将要创建的下载函数
        return new Response(
            JSON.stringify([{ 'src': `/file/${fileId}.${fileExtension}` }]),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// 辅助函数：提取 File ID
function getFileId(response) {
    if (!response.ok || !response.result) return null;
    const res = response.result;
    
    // 图片通常有多个尺寸，取最大的那个
    if (res.photo) {
        return res.photo[res.photo.length - 1].file_id;
    }
    if (res.document) return res.document.file_id;
    if (res.video) return res.video.file_id;
    if (res.audio) return res.audio.file_id;
    return null;
}

// 辅助函数：发送到 TG
async function sendToTelegram(formData, apiEndpoint, env) {
    const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;
    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        if (data.ok) {
            return { success: true, data: data };
        }
        return { success: false, error: data.description };
    } catch (e) {
        return { success: false, error: e.message };
    }
}
