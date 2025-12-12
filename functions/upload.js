// functions/upload.js

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. 获取前端传来的文件
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ status: 'error', message: 'No file found' }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. 构造请求转发给 Telegraph
    // Telegraph 需要 multipart/form-data，我们直接构造一个新的 FormData
    const telegraphData = new FormData();
    telegraphData.append('file', file);

    const telegraphRes = await fetch('https://telegra.ph/upload', {
      method: 'POST',
      body: telegraphData
    });

    const telegraphResult = await telegraphRes.json();

    // 检查 Telegraph 是否返回成功
    if (!Array.isArray(telegraphResult) || !telegraphResult[0].src) {
      return new Response(JSON.stringify({ status: 'error', message: 'Telegraph upload failed', details: telegraphResult }), { headers: { 'Content-Type': 'application/json' } });
    }

    const imageUrl = 'https://telegra.ph' + telegraphResult[0].src;

    // 3. (可选) 推送到 Telegram Bot
    // 读取你在 CF 后台设置的环境变量
    if (env.TG_Bot_Token && env.TG_Chat_ID) {
        await sendToTelegram(env.TG_Bot_Token, env.TG_Chat_ID, imageUrl);
    }

    // 4. 返回成功信息给前端
    return new Response(JSON.stringify({
      status: 'success',
      url: imageUrl
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: err.message }), { headers: { 'Content-Type': 'application/json' } });
  }
}

// 辅助函数：发送通知到 Telegram
async function sendToTelegram(token, chatId, imageUrl) {
    const text = `New Image Uploaded:\n${imageUrl}`;
    // 使用 sendMessage 发送文本链接，或者用 sendPhoto 发送图片
    const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    
    try {
        await fetch(tgUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                disable_web_page_preview: false // 让 TG 自动生成预览
            })
        });
    } catch (e) {
        console.error("Telegram notification failed:", e);
        // 通知失败不影响上传成功
    }
}
