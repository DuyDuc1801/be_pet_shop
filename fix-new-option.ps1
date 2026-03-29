# Chạy script này trong thư mục backend để fix tất cả { new: true }
# Cách dùng: cd vào thư mục backend rồi chạy: .\fix-new-option.ps1

$files = @(
    "controllers\adminAppointmentControllers.js",
    "controllers\appointmentControllers.js",
    "controllers\authControllers.js",
    "controllers\productControllers.js",
    "controllers\serviceControllers.js",
    "controllers\uploadControllers.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace "\{ new: true \}", "{ returnDocument: 'after' }"
        $content = $content -replace "\{ new: true, runValidators: true \}", "{ returnDocument: 'after', runValidators: true }"
        Set-Content $file $content -NoNewline
        Write-Host "Đã fix: $file"
    } else {
        Write-Host "Không tìm thấy: $file"
    }
}

Write-Host ""
Write-Host "Kiểm tra lại:"
Get-ChildItem -Path controllers -Recurse -Filter "*.js" | Select-String "new: true"
