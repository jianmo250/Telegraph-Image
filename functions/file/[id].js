// functions/file/[id].js

export async function onRequestGet(context) {
    const { params, env } = context;
    const fileName = params.id; // 获取 URL 中的文件名，例如 AgAC...jpg

    // 分离 ID 和 后缀
    // ID 可能包含连字符或下划线，这是正常的
    const lastDotIndex = fileName.lastIndexOf('.');
    const fileId = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

    if (!env.TG_Bot_Token) {
        return new Response('Missing TG_Bot_Token', { status: 500 });
    }

    try {
        // 1. 向 Telegram 请求文件路径
        const getFileUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`;
        const fileRes = await fetch(getFileUrl);
        const fileData = await fileRes.json();

        if (!fileData.ok) {
            return new Response('File not found in Telegram', { status: 404 });
        }

        const filePath = fileData.result.file_path;

        // 2. 构建下载链接
        const downloadUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;

        // 3. 从 Telegram 拉取文件流并转发给浏览器
        const imageRes = await fetch(downloadUrl);
        
        // 复制原始响应头（主要是 Content-Type），实现透传
        const headers = new Headers(imageRes.headers);
        headers.set('Cache-Control', 'public, max-age=31536000'); // 设置缓存，减少对 TG API 的请求
        
        return new Response(imageRes.body, {
            status: imageRes.status,
            headers: headers
        });

    } catch (err) {
        return new Response('Error fetching file: ' + err.message, { status: 500 });
    }
}
