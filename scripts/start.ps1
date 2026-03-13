#Requires -Version 5.1
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$PKG      = "@zhang_libo/resource-hub"
$APP_PORT = "3001"
$APP_DB   = "$env:APPDATA\resource-hub\resource-hub.db"
$DB_DIR   = "$env:APPDATA\resource-hub"

try {

Write-Host "============================================"
Write-Host "  ResourceHub 启动器"
Write-Host "============================================"
Write-Host ""

# 检查 Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[错误] 未找到 Node.js，请先安装 Node.js >= 18" -ForegroundColor Red
    Write-Host "       https://nodejs.org/"
    Read-Host "按回车键退出"
    exit 1
}

# [1/3] 检查是否已安装
Write-Host "[1/3] 检查 $PKG 是否已安装..."
$listOutput = npm list -g $PKG --depth=0 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      未安装，正在全局安装..." -ForegroundColor Yellow
    npm install -g $PKG
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 安装失败。" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host "      安装成功。" -ForegroundColor Green
} else {
    Write-Host "      已安装。"
}

# [2/3] 检查更新
Write-Host "[2/3] 检查更新..."
$outdated = npm outdated -g $PKG 2>$null
if ($outdated) {
    Write-Host "      发现新版本，正在升级..." -ForegroundColor Yellow
    npm update -g $PKG
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[警告] 升级失败，将使用当前版本。" -ForegroundColor Yellow
    } else {
        Write-Host "      升级成功。" -ForegroundColor Green
    }
} else {
    Write-Host "      已是最新版本。"
}

# 确保数据目录存在
if (-not (Test-Path $DB_DIR)) {
    New-Item -ItemType Directory -Path $DB_DIR -Force | Out-Null
    Write-Host "      已创建数据目录: $DB_DIR"
}

# [3/3] 启动
Write-Host "[3/3] 启动 ResourceHub..."
Write-Host "      端口: $APP_PORT"
Write-Host "      数据库: $APP_DB"
Write-Host "============================================"
Write-Host ""

$env:PORT    = $APP_PORT
$env:DB_PATH = $APP_DB
resource-hub

} catch {
    Write-Host ""
    Write-Host "[错误] $_" -ForegroundColor Red
} finally {
    Write-Host ""
    Read-Host "按回车键关闭窗口"
}
