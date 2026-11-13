# Dọn sạch tất cả tiến trình node.exe đang chạy mồ côi
Write-Host ">>> Đang quét và tắt các tiến trình Node.js chạy ngầm..." -ForegroundColor Yellow
$procs = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($procs) {
    $count = ($procs | Measure-Object).Count
    $procs | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host ">>> Đã tắt thành công $count tiến trình Node.js!" -ForegroundColor Green
} else {
    Write-Host ">>> Không có tiến trình Node.js nào đang chạy." -ForegroundColor Cyan
}

