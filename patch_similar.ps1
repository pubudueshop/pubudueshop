#!/usr/bin/env pwsh
# Inject loadSimilarProducts JS into all product pages that are missing it

$files = Get-ChildItem -Recurse -Filter "index.html" | Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.DirectoryName -ne (Get-Location).Path
}

$patched = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8

    # Only product pages with similar-products-section but missing loadSimilarProducts
    if ($content -notmatch 'similar-products-section') { continue }
    if ($content -match 'loadSimilarProducts') { continue }

    # Extract product data
    $idMatch      = [regex]::Match($content, "id:\s*'([^']*)'")
    $catMatch     = [regex]::Match($content, "mainCategory:\s*'([^']*)'")
    $subCatMatch  = [regex]::Match($content, "subCategory:\s*'([^']*)'")

    $prodId  = if ($idMatch.Success)     { $idMatch.Groups[1].Value }     else { "" }
    $mainCat = if ($catMatch.Success)    { $catMatch.Groups[1].Value }    else { "" }
    $subCat  = if ($subCatMatch.Success) { $subCatMatch.Groups[1].Value } else { "" }

    $similarJs = @"

function getSelectedQty() {
    var el = document.getElementById('qty-readout');
    return el ? parseInt(el.textContent) || 1 : 1;
}

function loadSimilarProducts() {
    var grid = document.getElementById('similar-products-grid');
    if (!grid) return;
    var currentId = '$prodId';
    var currentCat = '$mainCat';
    var currentSubCat = '$subCat';
    var attempts = 0;
    var interval = setInterval(function() {
        attempts++;
        var allProducts = window.allProducts || (typeof products !== 'undefined' ? products : []);
        var similar = allProducts.filter(function(p) {
            return String(p.id) !== String(currentId) &&
                   (p.subCategory === currentSubCat || p.mainCategory === currentCat);
        }).slice(0, 4);
        if (similar.length > 0 || attempts > 30) {
            clearInterval(interval);
            if (similar.length === 0) {
                var sec = document.getElementById('similar-products-section');
                if (sec) sec.style.display = 'none';
                return;
            }
            grid.innerHTML = similar.map(function(p) {
                var slug = (p.title||'').toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
                var mSlug = (p.mainCategory||'').toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
                var sSlug = (p.subCategory||'').toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
                var url = sSlug ? '/'+mSlug+'/'+sSlug+'/'+slug+'/' : '/'+mSlug+'/'+slug+'/';
                var inStock = (parseInt(p.stock)||0) > 0;
                return '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">' +
                    '<a href="'+url+'">' +
                    '<div class="aspect-square bg-gray-50 p-3 flex items-center justify-center">' +
                    '<img src="'+(p.image||'')+'" alt="'+(p.title||'').replace(/"/g,"'")+'" class="w-full h-full object-contain" loading="lazy">' +
                    '</div></a>' +
                    '<div class="p-3">' +
                    '<a href="'+url+'" class="text-sm font-semibold text-gray-800 hover:text-blue-600 line-clamp-2 block mb-1">'+(p.title||'')+'</a>' +
                    '<div class="text-red-600 font-bold text-sm mb-2">LKR '+(parseInt(p.price)||0).toLocaleString()+'</div>' +
                    (inStock
                        ? '<button onclick="if(window.addToCart) addToCart(\''+p.id+'\', 1)" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">Add to Cart</button>'
                        : '<span class="text-xs text-red-400 font-medium">Out of Stock</span>') +
                    '</div></div>';
            }).join('');
        }
    }, 600);
}

document.addEventListener('DOMContentLoaded', function() {
    // Try immediately, then retry as products load from Firebase
    setTimeout(loadSimilarProducts, 800);
    setTimeout(loadSimilarProducts, 2000);
    setTimeout(loadSimilarProducts, 4000);
});
"@

    # Inject before closing </script> of the _currentModalProduct block
    $content = $content -replace '(// Also push into products array once script\.js loads\s*document\.addEventListener\(''DOMContentLoaded'', function\(\) \{[^}]*\}\);)\s*</script>', "`$1`n$similarJs`n</script>"

    Set-Content $file.FullName $content -Encoding UTF8 -NoNewline
    $patched++
}

Write-Host "Patched $patched product pages with loadSimilarProducts."
