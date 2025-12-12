export async function onRequestGet(context) {
    const { params, env } = context;
    const fileName = params.id;

    // 简单的后缀名分离
    const lastDotIndex = fileName.lastIndexOf('.');
    const fileId = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex + 1).toLowerCase() : '';

    if (!env.TG_Bot_Token) {
        return new Response('Missing TG_Bot_Token', { status: 500 });
    }

    try {
        // 1. 获取文件路径
        const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`;
        const fileRes = await fetch(getFileUrl);
        const fileData = await fileRes.json();

        if (!fileData.ok) {
            return new Response('File not found', { status: 404 });
        }

        const filePath = fileData.result.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;

        // 2. 拉取文件流
        const imageRes = await fetch(downloadUrl);

        // 3. 重构响应头 (关键步骤)
        const headers = new Headers(imageRes.headers);
        
        // 强制浏览器缓存一年，减少 API 调用
        headers.set('Cache-Control', 'public, max-age=31536000');
        
        // 设置 Content-Disposition 为 inline，强制浏览器预览而不是下载
        headers.set('Content-Disposition', `inline; filename="${fileName}"`);

        // 根据后缀强制设置 Content-Type
        const mimeType = getMimeType(ext);
        if (mimeType) {
            headers.set('Content-Type', mimeType);
        }

        return new Response(imageRes.body, {
            status: imageRes.status,
            headers: headers
        });

    } catch (err) {
        return new Response('Error: ' + err.message, { status: 500 });
    }
}

// 简单的 MIME 类型映射
function getMimeType(ext) {
    const map = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg'
    };
    return map[ext] || null; // 如果未知，留空让浏览器自己猜或沿用上游
}
