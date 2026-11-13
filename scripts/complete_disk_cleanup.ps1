# ==============================================================================
# SMARTWAREHOUSE DISK CLEANUP (ELEVATED ADMIN SCRIPT)
# Muc tieu: Thu hoi them 25GB - 30GB de dat moc giai phong > 50GB o dia C:
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " DANG TIEN HANH DON DEP VA THU HOI DUNG LUONG O DIA C:    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Stop WSL to unlock VHDX files
Write-Host "`n[1/4] Tat WSL de giai phong khoa file dia ao..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 2

# 2. Compact VHDX files via diskpart
Write-Host "[2/4] Dang nen file dia ao WSL va Docker (Compact VHDX)..." -ForegroundColor Yellow

$ubuntuVhd = "$env:LOCALAPPDATA\Packages\CanonicalGroupLimited.Ubuntu22.04LTS_79rhkp1fndgsc\LocalState\ext4.vhdx"
$dockerVhd = "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx"

$diskpartScript = "$env:TEMP\compact_vhd.txt"
$dpCommands = @()

if (Test-Path $ubuntuVhd) {
    Write-Host " - Tim thay Ubuntu VHDX: $ubuntuVhd"
    $dpCommands += "select vdisk file=`"$ubuntuVhd`""
    $dpCommands += "attach vdisk readonly"
    $dpCommands += "compact vdisk"
    $dpCommands += "detach vdisk"
}

if (Test-Path $dockerVhd) {
    Write-Host " - Tim thay Docker VHDX: $dockerVhd"
    $dpCommands += "select vdisk file=`"$dockerVhd`""
    $dpCommands += "attach vdisk readonly"
    $dpCommands += "compact vdisk"
    $dpCommands += "detach vdisk"
}

if ($dpCommands.Count -gt 0) {
    $dpCommands | Out-File -FilePath $diskpartScript -Encoding ascii
    Write-Host " - Dang chay diskpart compact (co the mat 1-3 phut)..." -ForegroundColor Cyan
    diskpart /s $diskpartScript
    Remove-Item $diskpartScript -Force -ErrorAction SilentlyContinue
    Write-Host " => Da hoan tat nen dia ao VHDX!" -ForegroundColor Green
}

# 3. Optimize Pagefile (Virtual Memory) on C:
Write-Host "`n[3/4] Toi uu hoa Virtual Memory (Pagefile) tren o C:..." -ForegroundColor Yellow
try {
    $cs = Get-CimInstance Win32_ComputerSystem
    $cs.AutomaticManagedPagefile = $false
    Set-CimInstance -CimInstance $cs

    Get-CimInstance Win32_PageFileSetting | Remove-CimInstance -ErrorAction SilentlyContinue

    # Set initial 2048 MB, max 4096 MB on C: (tiet kiem ~15GB ngay lap tuc)
    New-CimInstance -ClassName Win32_PageFileSetting -Property @{
        Name = "C:\pagefile.sys"
        InitialSize = 2048
        MaximumSize = 4096
    }
    Write-Host " => Da gioi han pagefile C: o muc 2GB - 4GB (giai phong ~15GB)!" -ForegroundColor Green
} catch {
    Write-Warning "Khong the chinh sua Pagefile: $_"
}

# 4. Clean Windows Component Store (WinSxS backup)
Write-Host "`n[4/4] Don dep ban sao luu Windows Update cu (DISM)..." -ForegroundColor Yellow
try {
    dism.exe /online /cleanup-image /startcomponentcleanup /resetbase
    Write-Host " => Da don dep WinSxS!" -ForegroundColor Green
} catch {
    Write-Warning "Khong the chay DISM: $_"
}

# Ket qua cuoi cung
Write-Host "`n==========================================================" -ForegroundColor Green
$driveC = Get-PSDrive C
$freeGB = [math]::Round($driveC.Free / 1GB, 2)
$usedGB = [math]::Round($driveC.Used / 1GB, 2)
$totalGB = [math]::Round(($driveC.Free + $driveC.Used) / 1GB, 2)
Write-Host "HOAN TAT! Dung luong o C hien tai: $freeGB GB trong / $totalGB GB" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Nhan phim bat ky de thoat..."
[void][System.Console]::ReadKey()

