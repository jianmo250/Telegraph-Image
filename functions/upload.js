export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. 获取前端上传的文件
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ status: 'error', message: '未找到文件' }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. 构造发送给 Telegraph 的数据
    const telegraphData = new FormData();
    // 显式指定文件名，防止文件名丢失导致 Telegraph 报错
    telegraphData.append('file', file, file.name || 'image.jpg');

    // 3. 发送请求到 Telegraph
    // 关键修复：添加 User-Agent 和 Referer，否则 Telegraph 会报 Unknown error
    const telegraphRes = await fetch('https://telegra.ph/upload', {
      method: 'POST',
      body: telegraphData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Referer': 'https://telegra.ph/',
        'Origin': 'https://telegra.ph'
      }
    });

    // 4. 解析响应
    // 先按文本读取，以防返回的不是 JSON (便于调试)
    const resultText = await telegraphRes.text();
    let result;
    
    try {
      result = JSON.parse(resultText);
    } catch (e) {
      // 如果解析 JSON 失败，说明 Telegraph 返回了 HTML 错误页或 403
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Telegraph API 解析失败', 
        raw_response: resultText.substring(0, 200) // 只返回前200字符防止过长
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 5. 检查上传是否成功
    // Telegraph 成功时返回数组: [{"src":"/file/xxx.jpg"}]
    // 失败时返回对象: {"error":"xxx"}
    if (Array.isArray(result) && result[0].src) {
      const imageUrl = 'https://telegra.ph' + result[0].src;

      // --- 发送通知给 Telegram Bot (异步执行，不阻塞返回) ---
      if (env.TG_Bot_Token && env.TG_Chat_ID) {
        // 使用 waitUntil 确保在函数返回后请求继续执行
        context.waitUntil(sendToTelegram(env.TG_Bot_Token, env.TG_Chat_ID, imageUrl));
      }
      // -----------------------------------------------------

      return new Response(JSON.stringify({
        status: 'success',
        url: imageUrl
      }), { headers: { 'Content-Type': 'application/json' } });
    
    } else {
      // 上传失败，返回 Telegraph 的具体错误信息
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Telegraph 拒绝了上传', 
        details: result 
      }), { headers: { 'Content-Type': 'application/json' } });
    }

  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: '服务器内部错误', error: err.message }), { headers: { 'Content-Type': 'application/json' } });
  }
}

// 辅助函数：发送通知
async function sendToTelegram(token, chatId, imageUrl) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `新图片上传成功：\n${imageUrl}`,
        disable_web_page_preview: false
      })
    });
  } catch (e) {
    console.error('TG通知发送失败', e);
  }
}
