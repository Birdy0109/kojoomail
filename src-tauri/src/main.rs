// 发布版不弹黑色控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kojoomail_lib::run()
}
