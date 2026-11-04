//! 和系统打交道的小事，Windows / macOS 各一份：用默认程序打开、在文件夹里选中、打开网址、给来自邮件的文件打网络来源标记

use std::path::Path;
use std::process::Command;

/// 用系统默认程序打开文件
pub fn open_path(p: &Path) -> std::io::Result<()> {
    #[cfg(windows)]
    let c = Command::new("explorer").arg(p).spawn();
    #[cfg(not(windows))]
    let c = Command::new("open").arg(p).spawn();
    c.map(|_| ())
}

/// 打开文件所在的文件夹并选中它
pub fn reveal(p: &Path) {
    #[cfg(windows)]
    let _ = Command::new("explorer").arg("/select,").arg(p).spawn();
    #[cfg(not(windows))]
    let _ = Command::new("open").arg("-R").arg(p).spawn();
}

/// 用默认浏览器 / 邮件程序打开网址（调用方已经校验过协议）
pub fn open_url(u: &str) -> std::io::Result<()> {
    #[cfg(windows)]
    unsafe {
        // 不经过 rundll32：那样浏览器拿不到「切到前台」的许可，已开着的浏览器只在后面加个标签页，看起来像点了没反应。
        // 由本程序（正在前台）直接打开，并允许被打开的浏览器把窗口切到前面
        use windows::core::{w, PCWSTR};
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::{AllowSetForegroundWindow, ASFW_ANY, SW_SHOWNORMAL};
        let _ = AllowSetForegroundWindow(ASFW_ANY);
        let url: Vec<u16> = u.encode_utf16().chain(Some(0)).collect();
        let r = ShellExecuteW(None, w!("open"), PCWSTR(url.as_ptr()), PCWSTR::null(), PCWSTR::null(), SW_SHOWNORMAL);
        // 返回值大于 32 才是成功
        if r.0 as isize <= 32 {
            return Err(std::io::Error::other(format!("系统没能打开链接（错误 {}）", r.0 as isize)));
        }
        Ok(())
    }
    #[cfg(not(windows))]
    Command::new("open").arg(u).spawn().map(|_| ())
}

/// 标成「从网上下载的」（和浏览器下载的一样）：Windows 上 Office 用受保护视图打开、拦宏；macOS 上打开前由系统检查
pub fn mark_from_internet(p: &Path) {
    #[cfg(windows)]
    {
        let mut ads = p.as_os_str().to_owned();
        ads.push(":Zone.Identifier");
        let _ = std::fs::write(std::path::PathBuf::from(ads), "[ZoneTransfer]\r\nZoneId=3\r\n");
    }
    #[cfg(target_os = "macos")]
    {
        let v = format!("0081;{:x};Kojoo Mail;", chrono::Utc::now().timestamp());
        let _ = Command::new("xattr").args(["-w", "com.apple.quarantine", &v]).arg(p).status();
    }
}
