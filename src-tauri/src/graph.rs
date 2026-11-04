//! Outlook 发信走 Microsoft Graph：个人 Outlook 邮箱常被微软关掉 SMTP 登录（535 5.7.139 SmtpClientAuthentication is disabled），
//! 网页版没有开关。整封 MIME 交给 /me/sendMail，Graph 自己存「已发送」。收信仍走 IMAP。

use anyhow::{anyhow, Result};
use base64::Engine;
use std::time::Duration;

/// Graph 单次请求上限 4 MB（按 base64 后的 MIME 算）；附件在 MIME 里已经 base64 过一次，原始附件约 2 MB 以内
const LIMIT: usize = 4 * 1024 * 1024;

/// 令牌被拒的错误以这个开头（发信时据此换个令牌重试一次）
pub const AUTH_FAIL: &str = "Outlook 发信授权失效：";

pub async fn send(http: &reqwest::Client, token: &str, raw: &[u8]) -> Result<()> {
    let body = base64::engine::general_purpose::STANDARD.encode(raw);
    if body.len() > LIMIT - 4096 {
        return Err(anyhow!("Outlook 一次最多发约 2 MB 的附件，这封超了，请减少附件或改用下载链接"));
    }
    let secs = crate::smtp::upload_secs(raw.len());
    let r = http
        .post("https://graph.microsoft.com/v1.0/me/sendMail")
        .bearer_auth(token)
        .header("Content-Type", "text/plain")
        .body(body)
        .timeout(Duration::from_secs(secs))
        .send()
        .await
        .map_err(|e| anyhow!("连不上 Outlook 发信服务：{e}"))?;
    let status = r.status();
    if status.is_success() {
        return Ok(());
    }
    let v: serde_json::Value = r.json().await.unwrap_or_default();
    let code = v["error"]["code"].as_str().unwrap_or("");
    let msg = v["error"]["message"].as_str().unwrap_or(code);
    Err(match status.as_u16() {
        401 => anyhow!("{AUTH_FAIL}{msg}"),
        403 => anyhow!("没有 Outlook 发信权限：请在设置里重新登录这个账号，并同意「代你发送邮件」（{msg}）"),
        _ => anyhow!("Outlook 发信失败（{status}）：{msg}"),
    })
}
