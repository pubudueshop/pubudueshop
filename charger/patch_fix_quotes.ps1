#!/usr/bin/env pwsh
# Fix the broken single-quote JS syntax in all product pages

$files = Get-ChildItem -Recurse -Filter "index.html" | Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.DirectoryName -ne (Get-Location).Path
}

$patched = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8

    # Check if this file has the broken syntax
    if ($content -notmatch "addToCart\('' \+ p\.id \+ ''") { continue }

    # Fix the broken Add to Cart button line
    $broken = "(inStock ? '<button onclick=""if(window.addToCart) addToCart('' + p.id + '', 1)"" class=""w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"">Add to Cart</button>' :"
    $fixed  = "(inStock ? '<button onclick=""if(window.addToCart)addToCart(\''+p.id+'\',1)"" class=""w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg"">Add to Cart</button>' :"

    # Use simple string replacement
    $newContent = $content.Replace(
        "addToCart('' + p.id + '', 1)",
        "addToCart(\''+p.id+'\',1)"
    )

    if ($newContent -ne $content) {
        Set-Content $file.FullName $newContent -Encoding UTF8 -NoNewline
        $patched++
    }
}

Write-Host "Fixed $patched files."
