<#
.SYNOPSIS
    Şatafat Media - 局域网大文件互传服务端 (Windows 原生免安装高性能引擎)
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Şatafat Media - 局域网极速快传 "

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$WebDir = Join-Path $ScriptDir "web"
$CsFile = Join-Path $ScriptDir "LanServer.cs"

# 默认共享与下载目录设在当前用户的“下载”文件夹下的 LAN_Share
$DefaultStorage = Join-Path ([Environment]::GetFolderPath("UserProfile")) "Downloads\LAN_Share"

# 检查是否存在自定义接收目录配置文件 config.json
$ConfigFile = Join-Path $ScriptDir "config.json"
if (Test-Path $ConfigFile) {
    try {
        $cfgJson = Get-Content $ConfigFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($cfgJson.storageDir -and $cfgJson.storageDir.Trim() -ne "") {
            $DefaultStorage = $cfgJson.storageDir.Trim()
        }
    } catch {}
}

if (-not (Test-Path $DefaultStorage)) {
    New-Item -ItemType Directory -Force -Path $DefaultStorage | Out-Null
}

# 获取所有有效的局域网 IPv4 地址
$localIps = @()
try {
    $nics = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | 
        Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' }
    
    foreach ($nic in $nics) {
        $ipProps = $nic.GetIPProperties()
        foreach ($addr in $ipProps.UnicastAddresses) {
            if ($addr.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork) {
                $ipStr = $addr.Address.ToString()
                if (-not $ipStr.StartsWith("127.") -and -not $ipStr.StartsWith("169.254.")) {
                    $localIps += $ipStr
                }
            }
        }
    }
} catch {}

if ($localIps.Count -eq 0) {
    $localIps += "127.0.0.1"
}

# 寻找可用端口（默认 5200）
$port = 5200
while ($true) {
    $isAvailable = $true
    try {
        $tcpListener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
        $tcpListener.Start()
        $tcpListener.Stop()
    } catch {
        $isAvailable = $false
        $port++
    }
    if ($isAvailable) { break }
}

# 编译并加载高并发 C# 引擎
Write-Host "`n正在初始化 Şatafat Media 传输核心引擎... " -ForegroundColor Cyan
Add-Type -ReferencedAssemblies "System.Web.Extensions" -Path $CsFile

$config = New-Object LanShare.ServerConfig
$config.Port = $port
$config.WebDir = $WebDir
$config.StorageDir = $DefaultStorage
foreach ($ip in $localIps) {
    $config.LocalIps.Add($ip)
}

$server = New-Object LanShare.LanHttpServer($config)
$server.Start()

Clear-Host
Write-Host "============================================================" -ForegroundColor Green
Write-Host "        🚀 Şatafat Media - 局域网大文件极速互传已启动 " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host " [已支持设备] 电脑 (Windows/Mac)  |  iPhone (Safari)  |  安卓手机 " -ForegroundColor Yellow
Write-Host " [核心特性]   GB 级大文件秒速分片、断点续传、Safari 防息屏保持 " -ForegroundColor Yellow
Write-Host " [存储目录]   $DefaultStorage" -ForegroundColor Gray
Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " 📱 其他设备（手机/平板/电脑）浏览器输入此网址访问： " -ForegroundColor Cyan

foreach ($ip in $localIps) {
    Write-Host "   👉 http://$($ip):$port " -ForegroundColor White
}
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " 💻 本机电脑访问: http://localhost:$port " -ForegroundColor DarkCyan
Write-Host ""
Write-Host " (电脑浏览器将在 1 秒后自动打开，网页顶部已为您高亮显示其他设备访问网址) " -ForegroundColor Gray
Write-Host " 按 Ctrl+C 即可停止服务。 " -ForegroundColor DarkGray
Write-Host "============================================================`n" -ForegroundColor Green

# 自动在默认浏览器中打开
Start-Process "http://localhost:$port"

# 保持前台运行
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`n正在停止传输服务... " -ForegroundColor Yellow
    $server.Stop()
    Write-Host "服务已安全退出。 " -ForegroundColor Green
}
