# Telegraph-Image

免费图片托管解决方案，Flickr/imgur 替代品。使用 Cloudflare Pages 和 Telegraph。


> [!IMPORTANT]
>
> 由于原有的Telegraph API接口被官方关闭，需要将上传渠道切换至Telegram Channel，请按照文档中的部署要求设置`TG_Bot_Token`和`TG_Chat_ID`，否则将无法正常使用上传功能。

## 如何获取Telegram的`Bot_Token`和`Chat_ID`

如果您还没有Telegram账户，请先创建一个。接着，按照以下步骤操作以获取`BOT_TOKEN`和`CHAT_ID`：

1. **获取`Bot_Token`**
   - 在Telegram中，向[@BotFather](https://t.me/BotFather)发送命令`/newbot`，根据提示依次输入您的机器人名称和用户名。成功创建机器人后，您将会收到一个`BOT_TOKEN`，用于与Telegram API进行交互。
   
![202409071744569](https://github.com/user-attachments/assets/04f01289-205c-43e0-ba03-d9ab3465e349)

2. **设置机器人为频道管理员**
   - 创建一个新的频道（Channel），进入该频道后，选择频道设置。将刚刚创建的机器人添加为频道管理员，这样机器人才能发送消息。

![202409071758534](https://github.com/user-attachments/assets/cedea4c7-8b31-42e0-98a1-8a72ff69528f)
   
![202409071758796](https://github.com/user-attachments/assets/16393802-17eb-4ae4-a758-f0fdb7aaebc4)


3. **获取`Chat_ID`**
   - 通过[@VersaToolsBot](https://t.me/VersaToolsBot)获取您的频道ID。向该机器人发送消息，按照指示操作，最后您将得到`CHAT_ID`（即频道的ID）。
   - 或者通过[@GetTheirIDBot](https://t.me/GetTheirIDBot)获取您的频道ID。向该机器人发送消息，按照指示操作，最后您将得到`CHAT_ID`（即频道的ID）。

   ![202409071751619](https://github.com/user-attachments/assets/59fe8b20-c969-4d13-8d46-e58c0e8b9e79)

最后去Cloudflare Pages后台设置相关的环境变量（注：修改环境变量后，需要重新部署才能生效）
| 环境变量        | 示例值                    | 说明                                                                                   |
|-----------------|---------------------------|----------------------------------------------------------------------------------------|
| `TG_Bot_Token`   | `123468:AAxxxGKrn5`        | 从[@BotFather](https://t.me/BotFather)获取的Telegram Bot Token。                        |
| `TG_Chat_ID`     | `-1234567`                 | 频道的ID，确保TG Bot是该频道或群组的管理员。 |

## 如何部署

### 提前准备

你唯一需要提前准备的就是一个 Cloudflare 账户 （如果需要在自己的服务器上部署，不依赖 Cloudflare，可参考[#46](https://github.com/cf-pages/Telegraph-Image/issues/46) ）

### 手把手教程

简单 3 步，即可部署本项目，拥有自己的图床

1.Fork 本仓库 (注意：必须使用 Git 或者 Wrangler 命令行工具部署后才能正常使用，[文档](https://developers.cloudflare.com/pages/functions/get-started/#deploy-your-function))

2.打开 Cloudflare Dashboard，进入 Pages 管理页面，选择创建项目，选择`连接到 Git 提供程序`

![1](https://telegraph-image.pages.dev/file/8d4ef9b7761a25821d9c2.png)

3. 按照页面提示输入项目名称，选择需要连接的 git 仓库，点击`部署站点`即可完成部署

4.部署完成后前往后台依次点击`设置`->`函数`->`KV 命名空间绑定`->`编辑绑定`->`变量名称`填写：`img_url` `KV 命名空间` 选择你提前创建好的 KV 储存空间 

## 特性

1.无限图片储存数量，你可以上传不限数量的图片，不限制大小，原文件下载预览

2.无需购买服务器，托管于 Cloudflare 的网络上，当使用量不超过 Cloudflare 的免费额度时，完全免费

3.无需购买域名，可以使用 Cloudflare Pages 提供的`*.pages.dev`的免费二级域名，同时也支持绑定自定义域名


### 限制

Cloudflare Function 免费版每日限制 100,000 个请求（即上传或是加载图片的总次数不能超过 100,000 次）如超过可能需要选择购买 Cloudflare Function 的付费套餐，如开启图片管理功能还会存在 KV 操作数量的限制，如超过需购买付费套餐




## 已经部署了的，如何更新？

直接同步上游GitHub项目，并重新部署（一般自动重新部署）

## 一些限制：

Cloudflare KV 每天只有 1000 次的免费写入额度，每有一张新的图片加载都会占用该写入额度，如果超过该额度，图片管理后台将无法记录新加载的图片

每天最多 100,000 次免费读取操作，图片每加载一次都会占用该额度（在没有缓存的情况下，如果你的域名在 Cloudflare 开启了缓存，当缓存未命中时才会占用该额度），超过黑白名单等功能可能会失效

每天最多 1,000 次免费删除操作，每有一条图片记录都会占用该额度，超过将无法删除图片记录

每天最多 1,000 次免费列出操作

绝大多数情况下，该免费额度都基本够用，并且可以稍微超出一点，不是已超出就立马停用，且每项额度单独计算，某项操作超出免费额度后只会停用该项操作，不影响其他的功能，即即便我的免费写入额度用完了，我的读写功能不受影响，图片能够正常加载，只是不能在图片管理后台看到新的图片了。

如果你的免费额度不够用，可以自行向 Cloudflare 购买 Cloudflare Workers 的付费版本，每月$5 起步，按量收费，没有上述额度限制

### Sponsorship

This project is tested with BrowserStack.

This project is support by [Cloudflare](https://www.cloudflare.com/).
