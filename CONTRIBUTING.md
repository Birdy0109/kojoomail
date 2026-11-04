# 参与 Kojoo Mail

谢谢你愿意帮忙。

## 提问题

- Bug：写清系统版本、Kojoo Mail 版本（设置 → 关于）、邮箱服务商、怎么复现。可以附上 设置 → 关于 →「导出诊断信息」生成的文件（邮箱地址已打码，不含密码和邮件内容），贴出来之前自己再看一眼
- 功能建议：先开 Issue 聊，再动手写代码，免得白做

## 提代码

1. 一个 Pull Request 只做一件事
2. 提交前跑一下：
   ```bash
   node node_modules/typescript/bin/tsc --noEmit
   cd src-tauri && cargo test --lib
   ```
3. 界面文字用中文，和现有说法保持一致
4. 别加定时轮询、别加常驻后台任务：省资源是这个项目的硬要求（每个账号一条连接、空闲不占 CPU）

## 授权约定（提交前请读）

本项目以 [AGPL-3.0](LICENSE) 开源，同时保留以其他许可证（比如商业授权）发布的权利，收入用来维持项目。

提交 Pull Request 即表示你同意：

1. 你的贡献是你自己写的，或者你有权按下面的条款提交；
2. 你的贡献按 AGPL-3.0 授权给所有人；
3. 你同时授予项目维护者一项永久、全球、免费、不可撤销的许可，可以把你的贡献用在本项目以其他许可证（包括商业许可证）发布的版本中。

你保留自己贡献的版权。

---

## Contributing (English)

Bug reports and pull requests are welcome. Keep each PR focused, run `tsc --noEmit` and `cargo test --lib` before submitting, and avoid adding polling or background timers.

By submitting a pull request you agree that (1) the contribution is your own work or you have the right to submit it, (2) it is licensed to everyone under AGPL-3.0, and (3) you grant the project maintainer a perpetual, worldwide, royalty-free, irrevocable license to include it in versions of this project released under other licenses, including commercial ones. You keep the copyright to your contribution.
