#!/usr/bin/env bash
# 空闲内存：不开调试端口启动程序，等它同步完静置，再量；第二遍用 --hidden（托盘模式）
#   bash idle.sh <exe> <数据目录> [等待秒数]
exe="$1"; data="$2"; wait="${3:-60}"
here="$(cd "$(dirname "$0")" && pwd -W)"
for mode in shown hidden; do
  arg=""; [ "$mode" = hidden ] && arg="--hidden"
  KOJOOMAIL_DATA="$data" "$exe" $arg &
  pid=$!
  sleep "$wait"
  wpid=$(powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \"Name='kojoomail.exe'\" | Where-Object { \$_.CommandLine -notlike '*KojooMail-real*' } | Sort-Object CreationDate | Select-Object -Last 1).ProcessId")
  echo "== $mode (pid $wpid, ${wait}s)"
  powershell -NoProfile -ExecutionPolicy Bypass -File "$here/mem.ps1" -root "$wpid"
  powershell -NoProfile -Command "\$p=Get-Process -Id $wpid; \$c1=\$p.TotalProcessorTime.TotalMilliseconds; Start-Sleep 20; \$p.Refresh(); 'CPU over 20s idle (main proc): {0:N0} ms' -f (\$p.TotalProcessorTime.TotalMilliseconds-\$c1)"
  taskkill //F //PID "$wpid" >/dev/null
  sleep 2
done
