@echo off
title GitHub 自动同步
echo ========================================
echo     正在同步当前项目到 GitHub ...
echo ========================================
echo.

:: 检查当前目录是否为 Git 仓库
if not exist ".git" (
    echo 错误：当前目录不是 Git 仓库，请将本脚本放在项目根目录下。
    pause
    exit /b 1
)

:: 检查 Git 是否可用
where git >nul 2>&1
if errorlevel 1 (
    echo 错误：未找到 Git，请确保 Git 已安装并添加到系统 PATH。
    pause
    exit /b 1
)

:: 1. 拉取远程最新代码（避免推送冲突）
echo [1/4] 正在拉取远程更新 ...
git pull
if errorlevel 1 (
    echo 拉取失败，可能存在冲突，请手动解决后重试。
    pause
    exit /b 1
)
echo 拉取完成。
echo.

:: 2. 添加所有更改
echo [2/4] 正在添加所有更改 ...
git add .
echo 添加完成。
echo.

:: 3. 提交更改（自动生成带时间戳的提交信息）
echo [3/4] 正在提交 ...
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set "curDate=%%a-%%b-%%c"
for /f "tokens=1-2 delims=: " %%a in ("%time%") do set "curTime=%%a-%%b"
set "commitMsg=Auto sync %curDate% %curTime%"
git commit -m "%commitMsg%"
if errorlevel 1 (
    echo 没有需要提交的更改，跳过提交步骤。
) else (
    echo 提交成功：%commitMsg%
)
echo.

:: 4. 推送到 GitHub
echo [4/4] 正在推送到 GitHub ...
git push
if errorlevel 1 (
    echo 推送失败，请检查网络或认证信息。
    pause
    exit /b 1
)
echo 推送完成。
echo.

echo ========================================
echo 同步成功！项目已更新到 GitHub。
echo ========================================
pause