export async function onRequestGet(context) {
    const { params, env } = context;
    const fileName = params.id;

    // 分离文件ID和后缀
    const lastDotIndex = fileName.lastIndexOf('.');
    const fileId = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
    const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex + 1).toLowerCase() : 'jpg';

    if (!env.TG_Bot_Token) {
        return new Response('Missing TG_Bot_Token', { status: 500 });
    }

    try {
        // 1. 拿到 Telegram 的真实下载路径
        const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`;
        const fileRes = await fetch(getFileUrl);
        const fileData = await fileRes.json();

        if (!fileData.ok) {
            return new Response('File not found', { status: 404 });
        }

        const filePath = fileData.result.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;

        // 2. 获取文件流
        const imageRes = await fetch(downloadUrl);

        // 3. 重写响应头 (关键步骤)
        // 我们创建一个全新的 Header，只保留必要的，去除 TG 原始的干扰信息
        const newHeaders = new Headers();
        
        // 允许跨域 (解决 Canvas 引用等问题)
        newHeaders.set('Access-Control-Allow-Origin', '*');
        
        // 强缓存 (原图很大，缓存很重要)
        newHeaders.set('Cache-Control', 'public, max-age=31536000');
        
        // 强制浏览器"内联"显示，而不是下载
        // 这里的 filename 设置很重要，浏览器会根据它判断类型
        newHeaders.set('Content-Disposition', `inline; filename="image.${ext}"`);

        // 强制设置正确的 Content-Type
        // 如果这里不设置正确，浏览器会把它当成未知文件拒绝渲染
        const mimeType = getMimeType(ext);
        newHeaders.set('Content-Type', mimeType);

        // 透传 Content-Length (如果有)
        if (imageRes.headers.get('Content-Length')) {
            newHeaders.set('Content-Length', imageRes.headers.get('Content-Length'));
        }

        return new Response(imageRes.body, {
            status: imageRes.status,
            headers: newHeaders
        });

    } catch (err) {
        return new Response('Error: ' + err.message, { status: 500 });
    }
}

// 补全常见 MIME 类型
function getMimeType(ext) {
    const map = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        'ico': 'image/x-icon',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg',
        'json': 'application/json'
    };
    // 默认 fallback 到 jpeg，大多数情况下浏览器能自动纠错
    return map[ext] || 'image/jpeg'; 
}
