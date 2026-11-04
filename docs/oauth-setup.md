# 一键登录：注册谷歌 / 微软应用

Gmail 和 Outlook 的一键登录（OAuth）需要 Kojoo Mail 自己有一个「客户端 ID」，由谷歌、微软发给开发者。拿到后写进 `.local/oauth.env`（不进 git），`scripts/build-installer.sh` 打包时会读进去：

```sh
KOJOOMAIL_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
KOJOOMAIL_GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
KOJOOMAIL_MS_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

没配的那家，界面上自动退回原来的方式（Gmail 用应用专用密码，Outlook 显示「暂不可用」）。

QQ、网易、iCloud 不对第三方客户端开放 OAuth，只能用授权码 / App 专用密码，这个没法做。

## 谷歌（Gmail）

1. 打开 <https://console.cloud.google.com/>，新建项目，名字随意（比如 Kojoo Mail）。
2. 左侧菜单进「Google Auth Platform」→「开始」：应用名称填 Kojoo Mail，用户支持邮箱选自己，受众选「外部」，联系邮箱填自己，创建。
3. 「数据访问」→「添加或移除范围」→ 在「手动添加范围」里填 `https://mail.google.com/` → 添加 → 保存。
4. 「受众」→ 发布状态点「发布应用」，改成「正式版」。
   - 不发布（停在「测试」）也能用，但要把自己加进测试用户，而且**长期授权 7 天就过期**，每周要重新登录一次。
   - 发布后没经过谷歌审核，登录时会看到「Google 尚未验证此应用」，点「高级」→「转至 Kojoo Mail（不安全）」继续即可。自用和小范围（100 人以内）没问题；要对外发行得走谷歌的安全审核（`mail.google.com` 是受限范围，要做第三方安全评估）。
5. 「客户端」→「创建客户端」→ 应用类型选「桌面应用」→ 创建。把「客户端 ID」和「客户端密钥」抄下来。
   - 桌面应用的密钥会打进安装包，谷歌的文档里明确说这种密钥不算机密，安全靠 PKCE。

## 微软（Outlook / Hotmail）

1. 打开 <https://entra.microsoft.com/>（或 portal.azure.com）→「应用注册」→「新注册」。
   - 用个人微软账号进不去应用注册时，需要先有一个目录（租户），可以申请免费的 Azure 账号得到。
2. 名称填 Kojoo Mail；受支持的账户类型选「任何组织目录中的账户和个人 Microsoft 账户」。
3. 重定向 URI：平台选「公共客户端/本机（移动和桌面）」，填 `http://localhost`，注册。
   - 一定要选「移动和桌面」，选成「Web」会要求客户端密钥，换令牌失败。
4. 在概述页抄下「应用程序（客户端）ID」。

不用加 API 权限、不用建密钥：程序登录时直接申请 IMAP、SMTP 和 Graph 的 Mail.Send 权限。公司或学校的微软邮箱，可能要管理员先同意这个应用。

## 原理（改代码时看）

- 授权码 + PKCE，系统浏览器登录，回调到本机随机端口（谷歌 `http://127.0.0.1:端口`，微软 `http://localhost:端口`），15 分钟没完成就放弃。
- 长期授权（refresh token）只存 Windows 凭据管理器，和密码同一个位置；短期令牌只放内存，过期前 2 分钟换新。微软每次换令牌会给新的长期授权，要存回去。
- 收信 IMAP `AUTHENTICATE XOAUTH2`，发信 SMTP `AUTH XOAUTH2`。
- Outlook 发信不走 SMTP，走 Graph `/me/sendMail`（整封 MIME，base64，单次 ≤4 MB）：个人 Outlook 邮箱常被微软关掉 SMTP 登录（`535 5.7.139 SmtpClientAuthentication is disabled`），网页版没有开关。微软一个令牌只对应一个服务，登录时同时同意 Graph 的 Mail.Send，换码时指明要收信的令牌，发信时再用长期授权换 Graph 令牌（`oauth::graph_token`）。2026-10-21 用真实个人账号验证过。
- 客户端 ID 是编译时写进程序的（`option_env!`），运行时同名环境变量优先（测试用）。
