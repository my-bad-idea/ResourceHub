@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

set "PKG=@zhang_libo/resource-hub"
set "APP_PORT=3001"
set "APP_DB=%APPDATA%\resource-hub\resourcehub.db"

echo ============================================
echo   ResourceHub 启动脚本
echo ============================================
echo.

:: ---- 检查 Node.js ----
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js ^>= 18
    echo        https://nodejs.org/
    pause
    exit /b 1
)

:: ---- 检查是否已全局安装 ----
echo [1/3] 检查 %PKG% 是否已安装...
call npm list -g %PKG% --depth=0 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo       未安装，正在全局安装...
    call npm install -g %PKG%
    if !ERRORLEVEL! neq 0 (
        echo [错误] 安装失败，请检查网络或权限
        pause
        exit /b 1
    )
    echo       安装完成
) else (
    echo       已安装
)

:: ---- 检查是否需要升级 ----
echo [2/3] 检查是否有新版本...
for /f "tokens=*" %%A in ('npm outdated -g %PKG% 2^>nul') do set "OUTDATED=%%A"
if defined OUTDATED (
    echo       发现新版本，正在升级...
    call npm update -g %PKG%
    if !ERRORLEVEL! neq 0 (
        echo [警告] 升级失败，将使用当前版本继续运行
    ) else (
        echo       升级完成
    )
) else (
    echo       已是最新版本
)

:: ---- 确保数据目录存在 ----
set "DB_DIR=%APPDATA%\resource-hub"
if not exist "%DB_DIR%" (
    mkdir "%DB_DIR%"
    echo       已创建数据目录: %DB_DIR%
)

:: ---- 启动应用 ----
echo [3/3] 启动 ResourceHub...
echo       端口: %APP_PORT%
echo       数据库: %APP_DB%
echo ============================================
echo.

set "PORT=%APP_PORT%"
set "DB_PATH=%APP_DB%"
call npx %PKG%

endlocal
