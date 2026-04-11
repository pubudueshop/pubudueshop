Set-Location "D:\OFFICE LETTER\OneDrive - Sri Lanka Police\Desktop\PubuduEshop"

$files = Get-ChildItem -Recurse -Filter "index.html" | Where-Object { $_.DirectoryName -ne (Get-Location).Path }
$count = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if this is a product page with the sticky-search-mobile issue
    # The cart-drawer is inside sticky-search-mobile - we need to close sticky-search-mobile before the cart drawer
    # Pattern: find </nav> then <div class="sticky-search-mobile"> that never closes before cart-drawer
    
    if ($content -match '<div class="sticky-search-mobile">') {
        # Close the sticky-search-mobile div right before the cart drawer comment
        $fixed = $content -replace '(\s*<!-- Cart Sidebar -->)', "`n    </div>`n`$1"
        
        if ($fixed -ne $content) {
            Set-Content $file.FullName $fixed -NoNewline
            $count++
        }
    }
}

Write-Output "Fixed cart drawer placement in $count pages"
