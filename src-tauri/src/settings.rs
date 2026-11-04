//! 应用设置（存在 settings 表的 "app" 键里，一个 JSON）

use crate::Ctx;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// system | light | dark
    pub theme: String,
    pub font_size: f32,
    /// compact | standard | cozy
    pub density: String,
    pub serif_titles: bool,
    pub autostart: bool,
    pub close_to_tray: bool,
    pub default_account: Option<i64>,
    /// important | all | none
    pub notify: String,
    /// 通知里显示主题和 AI 摘要；关掉只显示发件人
    pub notify_preview: bool,
    /// ask | always
    pub remote_images: String,
    pub undo_send_secs: u32,
    /// 设置页选的服务商（deepseek / qwen / kimi / openai / newapi / custom）；只用于界面显示，空=按地址猜
    pub ai_provider: String,
    pub ai_base: String,
    pub ai_model: String,
    pub ai_model_fine: String,
    pub ai_model_backup: String,
    pub ai_auto: bool,
    /// skip_bulk | all | important
    pub ai_scope: String,
    pub ai_daily_limit: i64,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            theme: "system".into(),
            font_size: 13.0,
            density: "standard".into(),
            serif_titles: true,
            autostart: false,
            close_to_tray: true,
            default_account: None,
            notify: "important".into(),
            notify_preview: true,
            remote_images: "ask".into(),
            undo_send_secs: 5,
            // 默认不接任何服务：用户在设置里选服务商、填密钥后才启用
            ai_provider: String::new(),
            ai_base: String::new(),
            ai_model: String::new(),
            ai_model_fine: String::new(),
            ai_model_backup: String::new(),
            ai_auto: true,
            ai_scope: "skip_bulk".into(),
            ai_daily_limit: 200,
        }
    }
}

pub fn load(ctx: &Ctx) -> Settings {
    if let Some(s) = ctx.settings_cache.lock().unwrap().clone() {
        return s;
    }
    let s: Settings = {
        let st = ctx.store.lock().unwrap();
        st.setting("app").and_then(|v| serde_json::from_str(&v).ok()).unwrap_or_default()
    };
    *ctx.settings_cache.lock().unwrap() = Some(s.clone());
    s
}

pub fn save(ctx: &Ctx, s: &Settings) -> anyhow::Result<()> {
    let mut s = s.clone();
    s.font_size = s.font_size.clamp(12.0, 16.0);
    s.ai_daily_limit = s.ai_daily_limit.clamp(0, 5000);
    s.undo_send_secs = s.undo_send_secs.min(30);
    {
        let st = ctx.store.lock().unwrap();
        st.set_setting("app", &serde_json::to_string(&s)?)?;
    }
    *ctx.settings_cache.lock().unwrap() = Some(s);
    Ok(())
}

/// 早期版本的默认接口写死在代码里、没存进设置。已经填过密钥的老用户：把当时的默认值存下来，升级后照常可用
pub fn keep_legacy_ai(ctx: &Ctx) {
    let (saved, accounts) = {
        let st = ctx.store.lock().unwrap();
        (st.setting("app"), st.conn.query_row("SELECT COUNT(*) FROM accounts", [], |r| r.get::<_, i64>(0)).unwrap_or(0))
    };
    // 全新安装（库里没账号）时凭据管理器里残留的旧密钥不算：让用户自己选服务商、看到确认
    if accounts == 0 || saved.as_deref().is_some_and(|v| v.contains("\"aiBase\"")) || crate::secret::get(crate::secret::AI_KEY).is_none() {
        return;
    }
    let mut s = load(ctx);
    s.ai_base = "https://s.lconai.com/v1".into();
    s.ai_model = "claude-haiku-5-5".into();
    s.ai_model_fine = "claude-opus-5-5".into();
    s.ai_model_backup = "deepseek-v4-flash".into();
    if let Err(e) = save(ctx, &s) {
        crate::applog::warn(&format!("保存旧版 AI 设置失败：{e}"));
    }
}
