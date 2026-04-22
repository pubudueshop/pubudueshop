#!/usr/bin/env pwsh
# Fix: remove broken loadSimilarProducts call and function from all product pages
# Keep switchProductImage, openZoom, closeZoom, getSelectedQty intact

$count = 0
Get-ChildItem -Recurse -Filter "index.html" | Where-Object {
    $_.DirectoryName -ne (Get-Location).Path
} | ForEach-Object {
    $txt = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    
    # Only process product pages with the broken loadSimilarProducts
    if (-not $txt.Contains('function loadSimilarProducts')) { continue }
    
    # Remove the DOMContentLoaded call to loadSimilarProducts
    $txt = $txt.Replace(
        "    // Load similar products from same category`n    loadSimilarProducts();`n",
        ""
    )
    $txt = $txt.Replace(
        "    // Load similar products from same category`r`n    loadSimilarProducts();`r`n",
        ""
    )
    
    # Remove the entire loadSimilarProducts function
    # Find start of function
    $funcStart = $txt.IndexOf("`nfunction loadSimilarProducts()")
    if ($funcStart -lt 0) { $funcStart = $txt.IndexOf("`r`nfunction loadSimilarProducts()") }
    
    if ($funcStart -ge 0) {
        # Find the closing of the function - look for the closing script tag after it
        $scriptEnd = $txt.IndexOf("</script>", $funcStart)
        if ($scriptEnd -ge 0) {
            # Remove from function start to just before </script>
            $txt = $txt.Substring(0, $funcStart) + "`n" + $txt.Substring($scriptEnd)
        }
    }
    
    [System.IO.File]::WriteAllText($_.FullName, $txt, [System.Text.Encoding]::UTF8)
    $count++
}

Write-Host "Fixed $count files."
