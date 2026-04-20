Set-Location "D:\OFFICE LETTER\OneDrive - Sri Lanka Police\Desktop\PubuduEshop"

$files = Get-ChildItem -Recurse -Filter "index.html" | Where-Object { $_.DirectoryName -ne (Get-Location).Path }
$count = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Remove sticky-search-mobile from the hide rule - JS will move cart out anyway
    # Also hide sticky-search-mobile via the standalone class in styles.css instead
    if ($content -match '\.hero, #home-featured, #products, #product-modal-root, \.sticky-search-mobile \{ display: none !important; \}') {
        $fixed = $content -replace '\.hero, #home-featured, #products, #product-modal-root, \.sticky-search-mobile \{ display: none !important; \}', '.hero, #home-featured, #products, #product-modal-root { display: none !important; } .sticky-search-mobile > .search-input-wrapper { display: none !important; }'
        if ($fixed -ne $content) {
            Set-Content $file.FullName $fixed -NoNewline
            $count++
        }
    }
}

Write-Output "Fixed sticky-search-mobile hide rule in $count pages"
