Set-Location "D:\OFFICE LETTER\OneDrive - Sri Lanka Police\Desktop\PubuduEshop"

$files = Get-ChildItem -Recurse -Filter "index.html" | Where-Object { $_.DirectoryName -ne (Get-Location).Path }
$count = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match '\.cart-overlay \{ z-index: 9998 !important; \}') {
        # Fix: cart-content must be above cart-overlay
        $fixed = $content -replace '\.cart-overlay \{ z-index: 9998 !important; \}', '.cart-overlay { z-index: 9998 !important; } .cart-content { z-index: 9999 !important; }'
        if ($fixed -ne $content) {
            Set-Content $file.FullName $fixed -NoNewline
            $count++
        }
    }
}

Write-Output "Fixed cart z-index in $count pages"
