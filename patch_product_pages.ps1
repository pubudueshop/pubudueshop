#!/usr/bin/env pwsh
# Patch all product pages: add title/price/desc to right col + similar products section

$files = Get-ChildItem -Recurse -Filter "index.html" | Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.DirectoryName -ne (Get-Location).Path
}

$patched = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Only patch product pages (have standalone-product-page class and qty-readout)
    if ($content -notmatch 'standalone-product-page' -or $content -notmatch 'qty-readout') { continue }
    # Skip if already patched
    if ($content -match 'similar-products-section') { continue }

    # 1. Replace old right info col (just qty+buttons, no title/price) with new one that has title/price/desc
    $oldRightCol = @'
                <!-- Right: Info Col (60%) -->
                <div class="md:w-3/5 p-8 flex flex-col">
                    <div class="mb-6 flex flex-wrap items-end gap-6">
                        <div class="flex flex-col gap-2">
                            <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Quantity</span>
                            <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden h-12 bg-white">
                                <button onclick="if(window.changeQty) changeQty(-1)" class="w-10 h-full hover:bg-gray-50 transition-colors font-bold text-gray-500">-</button>
                                <span id="qty-readout" class="w-12 text-center font-bold text-gray-900 border-x border-gray-100 flex items-center justify-center">1</span>
                                <button onclick="if(window.changeQty) changeQty(1)" class="w-10 h-full hover:bg-gray-50 transition-colors font-bold text-gray-500">+</button>
                            </div>
                        </div>
'@

    if ($content -notmatch [regex]::Escape('<!-- Right: Info Col (60%) -->')) { continue }

    # Extract product data from _currentModalProduct script block
    $titleMatch = [regex]::Match($content, "title:\s*'([^']*)'")
    $priceMatch = [regex]::Match($content, "price:\s*(\d+)")
    $stockMatch = [regex]::Match($content, "stock:\s*(\d+)")
    $idMatch    = [regex]::Match($content, "id:\s*'([^']*)'")
    $catMatch   = [regex]::Match($content, "mainCategory:\s*'([^']*)'")
    $subMatch   = [regex]::Match($content, "subCategory:\s*'([^']*)'")

    # Also try JSON.stringify format
    if (-not $titleMatch.Success) {
        $titleMatch = [regex]::Match($content, 'title:\s*"([^"]*)"')
    }

    $title    = if ($titleMatch.Success) { $titleMatch.Groups[1].Value } else { "Product" }
    $price    = if ($priceMatch.Success) { [int]$priceMatch.Groups[1].Value } else { 0 }
    $stock    = if ($stockMatch.Success) { [int]$stockMatch.Groups[1].Value } else { 0 }
    $prodId   = if ($idMatch.Success)    { $idMatch.Groups[1].Value } else { "" }
    $mainCat  = if ($catMatch.Success)   { $catMatch.Groups[1].Value } else { "" }
    $subCat   = if ($subMatch.Success)   { $subMatch.Groups[1].Value } else { "" }

    $priceFormatted = $price.ToString("N0")
    $stockBadge = if ($stock -gt 0) { '<span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-green-100 text-green-800">In Stock</span>' } else { '<span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-100 text-red-800">Out of Stock</span>' }
    $subBadge = if ($subCat) { "<span class=`"ml-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600`">$subCat</span>" } else { "" }

    $addCartBtn = if ($stock -gt 0) {
        "<button onclick=`"if(window.addToCart) addToCart('$prodId', getSelectedQty())`" class=`"w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-95`"><i class=`"fas fa-cart-plus`"></i> Add to Cart</button><button onclick=`"if(window.addToCart) { addToCart('$prodId', getSelectedQty()); if(window.toggleCart) toggleCart(true); }`" class=`"w-full bg-green-500 hover:bg-green-600 text-white font-bold h-12 rounded-lg shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 active:scale-95`"><i class=`"fab fa-whatsapp`"></i> Buy via WhatsApp</button>"
    } else {
        "<button disabled class=`"w-full bg-gray-200 text-gray-500 font-bold h-12 rounded-lg cursor-not-allowed flex items-center justify-center gap-2`"><i class=`"fas fa-ban`"></i> Out of Stock</button>"
    }

    $newRightCol = @"
                <!-- Right: Info Col (60%) -->
                <div class="md:w-3/5 p-8 flex flex-col">
                    <div class="mb-3">$stockBadge$subBadge</div>
                    <h1 class="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 leading-tight">$title</h1>
                    <div class="text-3xl font-black text-red-600 mb-6">LKR $priceFormatted</div>
                    <div class="mt-auto flex flex-wrap items-end gap-4">
                        <div class="flex flex-col gap-2">
                            <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Quantity</span>
                            <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden h-12 bg-white">
                                <button onclick="if(window.changeQty) changeQty(-1)" class="w-10 h-full hover:bg-gray-50 transition-colors font-bold text-gray-500">-</button>
                                <span id="qty-readout" class="w-12 text-center font-bold text-gray-900 border-x border-gray-100 flex items-center justify-center">1</span>
                                <button onclick="if(window.changeQty) changeQty(1)" class="w-10 h-full hover:bg-gray-50 transition-colors font-bold text-gray-500">+</button>
                            </div>
                        </div>
                        <div class="flex-1 min-w-[200px] flex flex-col gap-2">$addCartBtn</div>
                    </div>
"@

    # Replace old right col opening with new one
    $content = $content -replace '(?s)<!-- Right: Info Col \(60%\) -->\s*<div class="md:w-3/5 p-8 flex flex-col">\s*<div class="mb-6 flex flex-wrap items-end gap-6">\s*<div class="flex flex-col gap-2">\s*<span class="text-\[10px\] uppercase font-bold text-gray-400 tracking-wider">Quantity</span>\s*<div class="flex items-center border border-gray-200 rounded-lg overflow-hidden h-12 bg-white">\s*<button onclick="if\(window\.changeQty\) changeQty\(-1\)"[^<]*</button>\s*<span id="qty-readout"[^<]*</span>\s*<button onclick="if\(window\.changeQty\) changeQty\(1\)"[^<]*</button>\s*</div>\s*</div>', $newRightCol

    # 2. Add similar products section before </div></div> closing of main container (before Mobile Sticky Bar)
    $similarSection = @'

        <!-- Similar Products -->
        <div class="mt-8 mb-24" id="similar-products-section">
            <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
                <i class="fas fa-th-large text-blue-500"></i> Similar Products
            </h2>
            <div id="similar-products-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>
                <div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>
                <div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>
                <div class="bg-white rounded-xl border border-gray-100 h-48 animate-pulse"></div>
            </div>
        </div>
    </div>
</div>
'@

    # Replace the closing of the main product container
    $content = $content -replace '(?s)(\s*</div>\s*</div>\s*\n<!-- Mobile Sticky Bottom Bar -->)', "$similarSection`n<!-- Mobile Sticky Bottom Bar -->"

    # 3. Add loadSimilarProducts JS before </script> in the _currentModalProduct block
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
        if (similar.length > 0 || attempts > 20) {
            clearInterval(interval);
            if (similar.length === 0) { document.getElementById('similar-products-section').style.display='none'; return; }
            grid.innerHTML = similar.map(function(p) {
                var slug = (p.title||'').toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
                var mSlug = (p.mainCategory||'').toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
                var sSlug = (p.subCategory||'').toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
                var url = sSlug ? '/'+mSlug+'/'+sSlug+'/'+slug+'/' : '/'+mSlug+'/'+slug+'/';
                var inStock = (parseInt(p.stock)||0) > 0;
                return '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">'+
                    '<a href="'+url+'"><div class="aspect-square bg-gray-50 p-3 flex items-center justify-center">'+
                    '<img src="'+(p.image||'')+'" alt="'+(p.title||'').replace(/"/g,"'")+'" class="w-full h-full object-contain" loading="lazy">'+
                    '</div></a><div class="p-3">'+
                    '<a href="'+url+'" class="text-sm font-semibold text-gray-800 hover:text-blue-600 line-clamp-2 block mb-1">'+(p.title||'')+'</a>'+
                    '<div class="text-red-600 font-bold text-sm mb-2">LKR '+(parseInt(p.price)||0).toLocaleString()+'</div>'+
                    (inStock ? '<button onclick="if(window.addToCart) addToCart(\''+p.id+'\', 1)" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">Add to Cart</button>' :
                    '<span class="text-xs text-red-400 font-medium">Out of Stock</span>')+
                    '</div></div>';
            }).join('');
        }
    }, 500);
}

document.addEventListener('DOMContentLoaded', function() {
    loadSimilarProducts();
});
"@

    # Inject before closing </script> of _currentModalProduct block
    $content = $content -replace '(document\.addEventListener\(''DOMContentLoaded'', function\(\) \{[^}]*\}\);)\s*</script>', "`$1`n$similarJs`n</script>"

    Set-Content $file.FullName $content -Encoding UTF8 -NoNewline
    $patched++
}

Write-Host "Patched $patched product pages."
