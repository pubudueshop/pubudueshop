#!/usr/bin/env pwsh
# Clean all similar products JS from product HTML pages
# Keep only the #similar-products-section HTML div
# script.js handles the rendering

$count = 0
$files = Get-ChildItem -Recurse -Filter "index.html" | Where-Object {
    $_.DirectoryName -ne (Get-Location).Path
}

foreach ($f in $files) {
    $txt = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    
    # Only process files that have the old loadSimilarProducts function
    if (-not $txt.Contains('function loadSimilarProducts')) { continue }

    # Find the <script> block that contains _currentModalProduct
    $start = $txt.IndexOf('<script>')
    while ($start -ge 0) {
        $end = $txt.IndexOf('</script>', $start)
        if ($end -lt 0) { break }
        $block = $txt.Substring($start, $end - $start + 9)
        if ($block.Contains('_currentModalProduct')) {
            # Extract just the window._currentModalProduct = {...}; part
            $objStart = $block.IndexOf('window._currentModalProduct = {')
            $objEnd   = $block.IndexOf('};', $objStart) + 2
            $obj = $block.Substring($objStart, $objEnd - $objStart)

            # Build clean replacement - no loadSimilarProducts, no DOMContentLoaded
            $clean = "<script>`nwindow._currentModalProduct = $($obj.Substring('window._currentModalProduct = '.Length))`n`nfunction getSelectedQty() {`n    var el = document.getElementById('qty-readout');`n    return el ? parseInt(el.textContent) || 1 : 1;`n}`n</script>"

            $txt = $txt.Substring(0, $start) + $clean + $txt.Substring($end + 9)
            break
        }
        $start = $txt.IndexOf('<script>', $end)
    }

    [System.IO.File]::WriteAllText($f.FullName, $txt, [System.Text.Encoding]::UTF8)
    $count++
}

Write-Host "Cleaned $count product pages."
