$files = Get-ChildItem -Recurse -Filter "index.html" | Where-Object {
    (Get-Content $_.FullName -Raw) -match "function loadSimilarProducts"
}

$fixedScript = 0
$fixedHtml = 0
$errors = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $changed = $false

    # ---- FIX 1: Replace the script block ----
    # Match from <script> containing window._currentModalProduct through </script>
    # We capture the _currentModalProduct object and rebuild the script block
    $scriptPattern = '(?s)<script>\s*// Pre-load product data[^\r\n]*\r?\n\s*window\._currentModalProduct = \{(.*?)\};\s*// Also push into products array.*?</script>'
    
    if ($content -match $scriptPattern) {
        $productData = $matches[1]
        $newScript = "<script>`nwindow._currentModalProduct = {$productData};`n`nfunction getSelectedQty() {`n    var el = document.getElementById('qty-readout');`n    return el ? parseInt(el.textContent) || 1 : 1;`n}`n</script>"
        $content = $content -replace $scriptPattern, $newScript
        $changed = $true
        $fixedScript++
    } else {
        $errors += "Script pattern NOT matched: $($file.FullName)"
    }

    # ---- FIX 2: Replace the similar products HTML section ----
    $htmlPattern = '(?s)        <!-- Similar Products \(injected by JS at runtime\) -->\s*<div class="mt-8 mb-24" id="similar-products-section">\s*<h2 class="text-xl font-bold mb-6 flex items-center gap-2">\s*<i class="fas fa-th-large text-blue-500"></i> Similar Products\s*</h2>\s*<div id="similar-products-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4">\s*<div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>\s*<div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>\s*<div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>\s*<div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>\s*</div>\s*</div>'
    
    $newHtml = '        <div class="mt-8 border-t pt-6" id="similar-products-section">
            <h3 class="text-lg font-bold mb-4">Similar Products</h3>
            <div id="similar-products-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4"></div>
        </div>'

    if ($content -match $htmlPattern) {
        $content = $content -replace $htmlPattern, $newHtml
        $fixedHtml++
    } else {
        $errors += "HTML pattern NOT matched: $($file.FullName)"
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}

Write-Host "Script blocks fixed: $fixedScript"
Write-Host "HTML sections fixed: $fixedHtml"
Write-Host "Total files processed: $($files.Count)"
if ($errors.Count -gt 0) {
    Write-Host "`nErrors/Warnings:"
    $errors | ForEach-Object { Write-Host "  $_" }
}
