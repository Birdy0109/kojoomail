param([int]$root)
# Sum memory of kojoomail + its WebView2 processes. ASCII only: Windows PowerShell 5 reads BOM-less files as ANSI.
# WebView2 children carry --webview-exe-name=kojoomail.exe on their command line.
$mine = @(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq $root -or ($_.Name -eq 'msedgewebview2.exe' -and $_.CommandLine -like '*webview-exe-name=kojoomail.exe*') })
$priv = 0
foreach ($m in $mine) {
  $pm = (Get-Process -Id $m.ProcessId -ErrorAction SilentlyContinue).PrivateMemorySize64 / 1MB
  $priv += $pm
  "{0,-22} {1,6} WS {2,7:N1} MB  private {3,6:N1} MB" -f $m.Name, $m.ProcessId, ($m.WorkingSetSize / 1MB), $pm
}
"TOTAL WS {0:N1} MB, private {1:N1} MB, processes {2}" -f (($mine | Measure-Object WorkingSetSize -Sum).Sum / 1MB), $priv, $mine.Count
