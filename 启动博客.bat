@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".tools\hugo\hugo.exe" (
  echo [错误] 未找到便携版 Hugo：.tools\hugo\hugo.exe
  echo 请重新下载 Hugo extended 0.146.0 或安装 Hugo 后运行。
  pause
  exit /b 1
)

start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 1200; Start-Process 'http://localhost:1313/'"
".tools\hugo\hugo.exe" server --buildDrafts --disableFastRender
pause
