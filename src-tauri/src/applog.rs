//! 本地日志：数据目录下 logs/kojoomail.log，超过 1 MB 轮换成 .1。
//! 只记连接、登录、同步、发信、AI 调用的结果和错误，不记邮件正文、密码和令牌。
//! 启动失败和崩溃时弹系统对话框（发布版没有控制台，不弹的话用户只看到程序消失）。

use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

const MAX: u64 = 1024 * 1024;

static PATH: OnceLock<PathBuf> = OnceLock::new();
static LOCK: Mutex<()> = Mutex::new(());

pub fn init(data_dir: &std::path::Path) {
    let dir = data_dir.join("logs");
    let _ = std::fs::create_dir_all(&dir);
    let _ = PATH.set(dir.join("kojoomail.log"));
    if cfg!(debug_assertions) {
        // 调试版 panic 会被运行时接住、程序继续跑：保留默认输出，不弹框
        write("INFO", &format!("启动（调试版）v{}", env!("CARGO_PKG_VERSION")));
        return;
    }
    std::panic::set_hook(Box::new(|info| {
        let at = info.location().map(|l| format!("{}:{}", l.file(), l.line())).unwrap_or_default();
        let msg = info.payload().downcast_ref::<&str>().map(|s| s.to_string()).or_else(|| info.payload().downcast_ref::<String>().cloned()).unwrap_or_default();
        if let Some(p) = PATH.get() {
            append(p, "PANIC", &format!("{msg} @ {at}"));
        }
        alert(&tr!("Kojoo Mail 遇到内部错误，需要关闭。\n\n{msg}\n\n详情已写入日志：{}", "Kojoo Mail hit an internal error and needs to close.\n\n{msg}\n\nDetails were written to the log: {}", path_text()));
    }));
    write("INFO", &format!("启动 v{} · {}", env!("CARGO_PKG_VERSION"), os_build()));
}

pub fn path() -> Option<&'static PathBuf> {
    PATH.get()
}

fn path_text() -> String {
    path().map(|p| p.display().to_string()).unwrap_or_default()
}

pub fn write(level: &str, msg: &str) {
    let Some(p) = PATH.get() else { return };
    let _g = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    if std::fs::metadata(p).map(|m| m.len() > MAX).unwrap_or(false) {
        let _ = std::fs::rename(p, p.with_extension("log.1"));
    }
    append(p, level, msg);
}

fn append(p: &std::path::Path, level: &str, msg: &str) {
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(p) {
        let t = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        let _ = writeln!(f, "{t} {level} {}", msg.replace('\n', " "));
    }
}

pub fn info(msg: &str) {
    write("INFO", msg)
}

pub fn warn(msg: &str) {
    write("WARN", msg)
}

/// 最近的 n 行（先读轮换出去的旧文件，再读当前文件）
pub fn tail(n: usize) -> String {
    let Some(p) = PATH.get() else { return String::new() };
    let _g = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let mut lines: Vec<String> = Vec::new();
    for f in [p.with_extension("log.1"), p.clone()] {
        if let Ok(b) = std::fs::read(&f) {
            lines.extend(String::from_utf8_lossy(&b).lines().map(str::to_string));
        }
    }
    let skip = lines.len().saturating_sub(n);
    lines[skip..].join("\n")
}

pub fn os_build() -> String {
    #[cfg(windows)]
    {
        let k = windows_registry::LOCAL_MACHINE.open(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion");
        let get = |n: &str| k.as_ref().ok().and_then(|k| k.get_string(n).ok()).unwrap_or_default();
        format!("Windows build {} ({})", get("CurrentBuildNumber"), get("DisplayVersion"))
    }
    #[cfg(not(windows))]
    {
        let v = std::process::Command::new("sw_vers").arg("-productVersion").output().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).unwrap_or_default();
        format!("macOS {v}")
    }
}

/// 启动失败：记日志、弹框说明原因
pub fn fatal(msg: &str) {
    write("FATAL", msg);
    alert(&tr!("Kojoo Mail 启动失败。\n\n{msg}\n\n日志：{}", "Kojoo Mail couldn't start.\n\n{msg}\n\nLog: {}", path_text()));
}

fn alert(text: &str) {
    #[cfg(windows)]
    unsafe {
        use windows::core::PCWSTR;
        use windows::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK};
        let w = |s: &str| s.encode_utf16().chain(Some(0)).collect::<Vec<u16>>();
        let (t, c) = (w(text), w("Kojoo Mail"));
        MessageBoxW(None, PCWSTR(t.as_ptr()), PCWSTR(c.as_ptr()), MB_OK | MB_ICONERROR);
    }
    #[cfg(target_os = "macos")]
    {
        // osascript 的字符串里引号和反斜杠要转义
        let t = text.replace('\\', "\\\\").replace('"', "\\\"");
        let _ = std::process::Command::new("osascript").args(["-e", &format!("display alert \"Kojoo Mail\" message \"{t}\" as critical")]).status();
    }
    #[cfg(not(any(windows, target_os = "macos")))]
    eprintln!("{text}");
}
