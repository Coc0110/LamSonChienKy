@echo off
setlocal

set "EDGE_EXE="
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  set "EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
)

if "%EDGE_EXE%"=="" (
  echo Microsoft Edge khong tim thay tren he thong.
  exit /b 1
)

echo Dang chup man hinh desktop preview (1920x1080)...
"%EDGE_EXE%" --headless=new --window-size=1920,1080 --screenshot="%~dp0desktop_preview.png" http://localhost:5173/

echo Dang chup man hinh mobile preview (390x844)...
"%EDGE_EXE%" --headless=new --window-size=390,844 --screenshot="%~dp0mobile_preview.png" http://localhost:5173/

echo Hoan tat! Anh duoc luu tai thu muc du an.
