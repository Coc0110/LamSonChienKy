@echo off
setlocal
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs" (
    set "PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs;%PATH%"
  )
)
npm run dev
