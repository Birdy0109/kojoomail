//! 界面语言（中文 / 英文）：设置里的 language = auto | zh | en；auto 看系统语言，系统是中文用中文，其他用英文。
//! 后台的报错、通知、托盘菜单、AI 输出语言都看这里。邮件分类等存进库里的值不翻译（是内部标识，前端按语言显示）。

use std::sync::atomic::{AtomicBool, Ordering};

static EN: AtomicBool = AtomicBool::new(false);

/// 按设置里的语言更新当前语言；返回是否变了
pub fn apply(pref: &str) -> bool {
    let en = match pref {
        "en" => true,
        "zh" => false,
        // 读不到系统语言时按中文（老用户都是中文）
        _ => sys_locale::get_locale().is_some_and(|l| !l.to_ascii_lowercase().starts_with("zh")),
    };
    EN.swap(en, Ordering::Relaxed) != en
}

pub fn en() -> bool {
    EN.load(Ordering::Relaxed)
}

/// 当前语言代码，给前端用
pub fn code() -> &'static str {
    if en() { "en" } else { "zh" }
}

/// 两种语言的报错前缀都认：报错生成和判断之间用户可能切了语言
pub fn starts_with_any(s: &str, zh: &str, en: &str) -> bool {
    s.starts_with(zh) || s.starts_with(en)
}

/// 按当前语言二选一
pub fn t<'a>(zh: &'a str, en: &'a str) -> &'a str {
    pick(self::en(), zh, en)
}

fn pick<'a>(is_en: bool, zh: &'a str, en: &'a str) -> &'a str {
    if is_en { en } else { zh }
}

#[cfg(test)]
mod tests {
    use super::*;

    // 不改全局语言：别的测试在并行跑，会断言中文报错
    #[test]
    fn pick_by_lang() {
        assert_eq!(pick(true, "中", "en"), "en");
        assert_eq!(pick(false, "中", "en"), "中");
    }
}
