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

        // ==== 修改重点 ====
        // 即使是图片，也强制使用 sendDocument，这样 Telegram 才会保存原图不压缩
        let apiEndpoint = 'sendDocument'; 
        
        // 注意：这里把 key 统一设为 document，而不是 photo
        telegramFormData.append("document", uploadFile);

        // 如果是视频或音频，还是可以用专用接口（视频通常也会被压缩，但 sendVideo 支持流式）
        // 如果你想视频也不压缩，也可以全部统统走 sendDocument
        // 下面保留了视频和音频的判断，但你可以根据需要注释掉，让所有文件都走 document
        if (uploadFile.type.startsWith('video/')) {
             // 视频如果走 sendVideo 也会被压缩，想原画就用下面的 sendDocument
             // telegramFormData.delete("document");
             // telegramFormData.append("video", uploadFile);
             // apiEndpoint = 'sendVideo';
        } else if (uploadFile.type.startsWith('audio/')) {
             telegramFormData.delete("document");
             telegramFormData.append("audio", uploadFile);
             apiEndpoint = 'sendAudio';
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

        // 写入 KV (如果绑定了)
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
    
    // 优先检查 document，因为我们现在主要用它
    if (res.document) return res.document.file_id;
    
    // 兼容其他类型
    if (res.photo) return res.photo[res.photo.length - 1].file_id;
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
