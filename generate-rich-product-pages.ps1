$ErrorActionPreference = 'Stop'

function Create-Slug($str) {
    if (-not $str) { return "" }
    $s = $str.ToLower()
    $s = [System.Text.RegularExpressions.Regex]::Replace($s, '[^\w\s-]', '')
    $s = [System.Text.RegularExpressions.Regex]::Replace($s, '\s+', '-')
    $s = [System.Text.RegularExpressions.Regex]::Replace($s, '-+', '-')
    return $s.Trim('-')
}

function Render-MarkdownDesc($text) {
    if (-not $text) { return '<p style="color:#94a3b8;">No description available.</p>' }
    $escaped = [System.Net.WebUtility]::HtmlEncode($text)
    $escaped = [System.Text.RegularExpressions.Regex]::Replace($escaped, '(?m)^## (.+)$', '</p><h3 style="font-size:1.05rem;font-weight:700;color:#1e293b;margin:14px 0 6px;">$1</h3><p style="margin:0;">')
    $escaped = [System.Text.RegularExpressions.Regex]::Replace($escaped, '(?m)^# (.+)$', '</p><h2 style="font-size:1.2rem;font-weight:800;color:#1e293b;margin:16px 0 8px;">$1</h2><p style="margin:0;">')
    $escaped = [System.Text.RegularExpressions.Regex]::Replace($escaped, '\*\*(.+?)\*\*', '<strong style="font-weight:700;color:#1e293b;">$1</strong>')
    $escaped = [System.Text.RegularExpressions.Regex]::Replace($escaped, '(?m)^---$', '</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0;"><p style="margin:0;">')
    $escaped = [System.Text.RegularExpressions.Regex]::Replace($escaped, '(?m)^[•\-\*] (.+)$', '</p><div style="display:flex;gap:8px;margin:4px 0;"><span style="color:#2563eb;font-weight:700;flex-shrink:0;">•</span><span>$1</span></div><p style="margin:0;">')
    $escaped = $escaped.Replace("`n`n", '</p><p style="margin:8px 0;">')
    $escaped = $escaped.Replace("`n", '<br>')
    return '<p style="margin:0;">' + $escaped + '</p>'
}

Write-Host "Fetching inventory from Firebase..."
$invUrl = "https://firestore.googleapis.com/v1/projects/pubudueshop-cde28/databases/(default)/documents/shop/inventory?key=AIzaSyDl9N6YmDJI9bhhdkeUQPUxWKxIhZhryus"
$invRes = Invoke-RestMethod -Uri $invUrl
$rawProducts = $invRes.fields.products.arrayValue.values

$baseHtml = Get-Content -Raw -Path "index.html"
$cleanBaseHtml = [System.Text.RegularExpressions.Regex]::Replace($baseHtml, '<!-- HOMEPAGE_CONTENT_START -->[\s\S]*?<!-- HOMEPAGE_CONTENT_END -->', '')
$cleanBaseHtml = $cleanBaseHtml.Replace('<script type="application/ld+json" id="product-structured-data"></script>', '')

$siteUrl = "https://ichouse.lk/"

Write-Host "Generating full rich product pages for $($rawProducts.Count) products..."

foreach ($item in $rawProducts) {
    $f = $item.mapValue.fields
    $id = if ($f.id.stringValue) { $f.id.stringValue } elseif ($f.id.integerValue) { $f.id.integerValue } else { "" }
    $title = $f.title.stringValue
    if (-not $id -or -not $title) { continue }

    $price = if ($f.price.integerValue) { [int]$f.price.integerValue } elseif ($f.price.stringValue) { [int]$f.price.stringValue } else { 0 }
    $stock = if ($f.stock.integerValue) { [int]$f.stock.integerValue } elseif ($f.stock.stringValue) { [int]$f.stock.stringValue } else { 0 }
    $desc = if ($f.description.stringValue) { $f.description.stringValue } else { "" }
    $longDesc = if ($f.longDescription.stringValue) { $f.longDescription.stringValue } else { $desc }
    $mainCat = if ($f.mainCategory.stringValue) { $f.mainCategory.stringValue } else { "General" }
    $subCat = if ($f.subCategory.stringValue) { $f.subCategory.stringValue } else { "" }
    $modelNumber = if ($f.modelNumber.stringValue) { $f.modelNumber.stringValue } else { "" }
    $brand = if ($f.brand.stringValue) { $f.brand.stringValue } else { "" }
    $image = if ($f.image.stringValue) { $f.image.stringValue } else { "" }

    $images = @()
    if ($f.images -and $f.images.arrayValue.values) {
        foreach ($imgVal in $f.images.arrayValue.values) {
            if ($imgVal.stringValue) { $images += $imgVal.stringValue }
        }
    }
    if ($images.Count -eq 0 -and $image) { $images += $image }

    $specs = @{}
    if ($f.specs -and $f.specs.mapValue.fields) {
        foreach ($prop in $f.specs.mapValue.fields.PSObject.Properties) {
            $val = if ($prop.Value.stringValue) { $prop.Value.stringValue } else { "" }
            $specs[$prop.Name] = $val
        }
    }

    $mainCatSlug = Create-Slug $mainCat
    $subCatSlug = if ($subCat) { Create-Slug $subCat } else { "" }
    $slug = Create-Slug $title

    $pUrl = if ($subCatSlug) { "$siteUrl$mainCatSlug/$subCatSlug/$slug/" } else { "$siteUrl$mainCatSlug/$slug/" }
    $pDir = if ($subCatSlug) { Join-Path (Join-Path $mainCatSlug $subCatSlug) $slug } else { Join-Path $mainCatSlug $slug }

    if (-not (Test-Path $pDir)) {
        New-Item -ItemType Directory -Path $pDir -Force | Out-Null
    }

    $cleanTitle = [System.Net.WebUtility]::HtmlEncode($title)
    $coreName = [System.Text.RegularExpressions.Regex]::Replace($title, '\s*\|\s*.*$', '')
    $coreName = [System.Text.RegularExpressions.Regex]::Replace($coreName, '\s*–\s*.*$', '')
    $coreName = [System.Text.RegularExpressions.Regex]::Replace($coreName, '\s+DIP-?\d+.*$', '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase).Trim()
    $fullTitle = "$coreName Price in Sri Lanka | IC House"

    $pkgStr = ""
    $pkgMatch = [System.Text.RegularExpressions.Regex]::Match("$title $desc", '\b(DIP-?\d+|SOP-?\d+|SOIC-?\d+|TSSOP-?\d+|QSOP-?\d+|\d+-Pin QSOP|SOT-?\d+(?:-\d+)?|TO-?\d+[A-Z0-9]*|QFN-?\d+|QFP-?\d+)\b', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($pkgMatch.Success) {
        $pkgStr = " (" + $pkgMatch.Groups[1].Value + ")"
    }
    $partNum = if ($modelNumber) { $modelNumber.ToUpper().Trim() } else { ($coreName -split '\s+')[0].ToUpper().Trim() }
    $seoDesc = "Buy original $partNum$pkgStr in Sri Lanka. Check pinout, datasheet, and specs. Fast islandwide delivery from IC House."

    # Build Breadcrumbs
    $bcHtml = @"
        <li class="flex items-center">
            <a href="$siteUrl" class="text-sm font-medium text-blue-600 hover:text-blue-700">Home</a>
        </li>
        <li class="flex items-center">
            <svg class="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/></svg>
            <a href="$siteUrl$mainCatSlug/" class="text-sm font-medium text-blue-600 hover:text-blue-700">$mainCat</a>
        </li>
"@
    if ($subCat) {
        $bcHtml += @"
        <li class="flex items-center">
            <svg class="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/></svg>
            <a href="$siteUrl$mainCatSlug/$subCatSlug/" class="text-sm font-medium text-blue-600 hover:text-blue-700">$subCat</a>
        </li>
"@
    }
    $bcShortTitle = if ($title.Length -gt 40) { $title.Substring(0, 40) + "…" } else { $title }
    $bcHtml += @"
        <li class="flex items-center">
            <svg class="w-3 h-3 text-gray-400 mx-1" fill="currentColor" viewBox="0 0 20 20"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/></svg>
            <span class="text-sm font-medium text-gray-500 cursor-default">$bcShortTitle</span>
        </li>
"@

    # Build Specs Rows
    $specsRows = ""
    $i = 0
    if ($specs.Count -gt 0) {
        foreach ($k in $specs.Keys) {
            $rowBg = if ($i % 2 -eq 0) { "bg-white" } else { "bg-gray-50" }
            $specsRows += "<tr class=""$rowBg""><td class=""px-4 py-3 text-sm font-semibold text-gray-700 border-b"">$k</td><td class=""px-4 py-3 text-sm text-gray-600 border-b"">$($specs[$k])</td></tr>"
            $i++
        }
    } else {
        $specsRows = "<tr class=""bg-white""><td class=""px-4 py-3 text-sm font-semibold text-gray-700 border-b"">Category</td><td class=""px-4 py-3 text-sm text-gray-600 border-b"">$(if ($subCat) { $subCat } else { $mainCat })</td></tr>"
    }

    # Thumbnails
    $thumbHtml = ""
    if ($images.Count -gt 1) {
        $thumbHtml = '<div class="flex gap-2 mt-4 overflow-x-auto pb-2 w-full scrollbar-hide">'
        $tIdx = 0
        foreach ($imgUrl in $images) {
            $border = if ($tIdx -eq 0) { "border-blue-500" } else { "border-gray-100" }
            $thumbHtml += "<img src=""$imgUrl"" alt=""$cleanTitle image $($tIdx+1)"" class=""w-20 h-20 object-contain p-1 border-2 $border rounded-md cursor-pointer hover:border-blue-500 transition-colors bg-white flex-shrink-0"" onclick=""switchProductImage(this, '$imgUrl')"" loading=""lazy"">"
            $tIdx++
        }
        $thumbHtml += '</div>'
    }

    $stockStatus = if ($stock -gt 0) { "In Stock" } else { "Out of Stock" }
    $stockColor = if ($stock -gt 0) { "bg-green-100 text-green-800" } else { "bg-red-100 text-red-800" }
    $formattedPrice = $price.ToString("N0")

    $descFormatted = Render-MarkdownDesc $longDesc

    $seoProductBlock = @"
<!-- ===== PRODUCT PAGE: hide homepage-only sections ===== -->
<style>
  body.standalone-product-page .about-section { display: none !important; }
</style>
<!-- ===== NEW PREMIUM PRODUCT LAYOUT ===== -->
<div class="bg-gray-50 min-h-screen font-['Inter',sans-serif] text-gray-900 pb-20 md:pb-0">
    <!-- Breadcrumbs -->
    <div class="max-w-7xl mx-auto px-4 py-4">
        <nav class="flex" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 md:space-x-3">
                $bcHtml
            </ol>
        </nav>
    </div>

    <!-- Product Main Card -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="flex flex-col md:flex-row">
                <!-- Left: Image Col (40%) -->
                <div class="md:w-2/5 p-6 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col items-center">
                    <div class="w-full aspect-square relative bg-white border border-gray-100 rounded-lg overflow-hidden group" style="cursor:zoom-in;">
                        <img src="$image" alt="$cleanTitle - Buy in Sri Lanka | IC House" class="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" id="main-product-img" loading="eager" onclick="openZoom(this.src)">
                        <div class="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-600 shadow-sm border border-gray-200 md:block hidden">
                            <i class="fas fa-search-plus mr-1"></i> Click to Zoom
                        </div>
                    </div>
                    $thumbHtml
                </div>

                <!-- Right: Info Col (60%) -->
                <div class="md:w-3/5 p-8 flex flex-col">
                    <!-- Stock Badge -->
                    <div class="mb-3">
                        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest $stockColor">$stockStatus</span>
                        $(if ($subCat) { "<span class=""ml-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"">$subCat</span>" })
                    </div>

                    <!-- Title -->
                    <h1 class="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 leading-tight">$cleanTitle</h1>

                    <!-- Price -->
                    <div class="text-3xl font-black text-red-600 mb-4">LKR $formattedPrice</div>

                    <!-- Model / Brand -->
                    <div class="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
                        $(if ($brand) { "<span class=""bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full""><i class=""fas fa-tag mr-1""></i> $brand</span>" })
                        $(if ($modelNumber) { "<span class=""bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full""><i class=""fas fa-barcode mr-1""></i> $modelNumber</span>" })
                    </div>

                    <!-- Quantity + Buttons -->
                    <div class="mt-auto flex flex-wrap items-end gap-4">
                        <div class="flex flex-col gap-2">
                            <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Quantity</span>
                            <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden h-12 bg-white">
                                <button onclick="if(window.changeQty) changeQty(-1)" class="w-10 h-full hover:bg-gray-50 transition-colors font-bold text-gray-500">-</button>
                                <span id="qty-readout" class="w-12 text-center font-bold text-gray-900 border-x border-gray-100 flex items-center justify-center">1</span>
                                <button onclick="if(window.changeQty) changeQty(1)" class="w-10 h-full hover:bg-gray-50 transition-colors font-bold text-gray-500">+</button>
                            </div>
                        </div>
                        <div class="flex-1 min-w-[200px] flex flex-col gap-2">
                            <button onclick="if(window.addToCart) addToCart('$id', getSelectedQty())" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-95">
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                            <button onclick="if(window.addToCart) { addToCart('$id', getSelectedQty()); if(window.toggleCart) toggleCart(true); }" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-12 rounded-lg shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2 active:scale-95">
                                <i class="fab fa-whatsapp"></i> Buy via WhatsApp
                            </button>
                        </div>
                    </div>
                    
                    <!-- Share Section -->
                    <div class="share-section mt-6 pt-4 border-t border-gray-100">
                        <div class="flex items-center gap-3">
                            <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Share</span>
                            <div class="flex gap-2">
                                <button id="seo-copy-btn" class="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-600 border border-gray-100 transition-all flex items-center gap-1">
                                    <i class="fas fa-link"></i> Copy
                                </button>
                                <button id="seo-fb-btn" class="px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold text-blue-600 border border-blue-100 transition-all flex items-center gap-1">
                                    <i class="fab fa-facebook"></i> Facebook
                                </button>
                                <button id="seo-wa-btn" class="px-4 py-2 bg-green-50 hover:bg-green-100 rounded-lg text-xs font-bold text-green-600 border border-green-100 transition-all flex items-center gap-1">
                                    <i class="fab fa-whatsapp"></i> WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Specs + Description -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="flex flex-col gap-6">
                <div class="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
                        <i class="fas fa-list-ul text-blue-500"></i> Specifications
                    </h2>
                    <table class="w-full text-left">
                        <tbody>$specsRows</tbody>
                    </table>
                </div>
                
                <!-- Cash on Delivery Banner -->
                <div class="bg-green-50 p-6 rounded-xl border border-green-200 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group cursor-pointer hover:shadow-md transition-all" onclick="window.open('https://wa.me/94789155130', '_blank')">
                    <div class="absolute -right-6 -top-6 w-24 h-24 bg-green-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                    <div class="absolute -left-6 -bottom-6 w-16 h-16 bg-green-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                    <div class="z-10 bg-white w-14 h-14 rounded-full flex items-center justify-center shadow-sm text-green-600 text-2xl mb-3">
                        <i class="fas fa-shipping-fast"></i>
                    </div>
                    <h3 class="z-10 font-bold text-gray-900 text-xl mb-1">Cash on Delivery Available</h3>
                    <p class="z-10 text-sm text-gray-600 mb-4 font-medium">Order now and pay when you receive it islandwide!</p>
                    <a href="https://wa.me/94789155130" target="_blank" onclick="event.stopPropagation()" class="z-10 bg-[#25d366] hover:bg-[#20bd5a] text-white font-bold py-3 px-6 rounded-full transition-colors flex items-center gap-2 shadow-md w-full justify-center">
                        <i class="fab fa-whatsapp text-xl"></i> WhatsApp: 078 915 5130
                    </a>
                </div>
            </div>

            <div class="bg-white p-8 rounded-xl border border-gray-200 shadow-sm h-fit">
                <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
                    <i class="fas fa-star text-blue-500"></i> Product Description
                </h2>
                <div class="text-gray-600 leading-relaxed text-left" style="line-height:1.8;">
                    $descFormatted
                </div>
            </div>
        </div>

        <!-- Similar Products -->
        <div class="mt-8 mb-24" id="similar-products-section">
            <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
                <i class="fas fa-th-large text-blue-500"></i> Similar ICs
            </h2>
            <div id="similar-products-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <!-- Injected by script.js -->
            </div>
        </div>
    </div>
</div>

<!-- Mobile Sticky Bottom Bar -->
<div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden flex gap-4 z-[2000] shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
    <button onclick="if(window.addToCart) addToCart('$id', getSelectedQty())" class="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 min-h-[48px]">
        <i class="fas fa-cart-plus"></i> Cart
    </button>
    <button onclick="if(window.addToCart) { addToCart('$id', getSelectedQty()); if(window.toggleCart) toggleCart(true); }" class="flex-1 bg-green-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 min-h-[48px]">
        <i class="fab fa-whatsapp"></i> Buy Now
    </button>
</div>

<script>
window._currentModalProduct = {
    id: '$id',
    title: $(ConvertTo-Json $title),
    price: $price,
    stock: $stock,
    image: $(ConvertTo-Json $image),
    mainCategory: $(ConvertTo-Json $mainCat),
    subCategory: $(ConvertTo-Json $subCat)
};

function getSelectedQty() {
    var el = document.getElementById('qty-readout');
    return el ? parseInt(el.textContent) || 1 : 1;
}

function switchProductImage(thumb, src) {
    var main = document.getElementById('main-product-img');
    if (main) main.src = src;
    var thumbs = thumb.parentElement.querySelectorAll('img');
    thumbs.forEach(function(t) {
        t.classList.remove('border-blue-500');
        t.classList.add('border-gray-100');
    });
    thumb.classList.remove('border-gray-100');
    thumb.classList.add('border-blue-500');
}

function openZoom(src) {
    var overlay = document.getElementById('zoom-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'zoom-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
        overlay.innerHTML = '<img id="zoom-img" style="max-width:92vw;max-height:92vh;object-fit:contain;border-radius:8px;box-shadow:0 25px 60px rgba(0,0,0,0.5);"><button onclick="closeZoom()" style="position:absolute;top:16px;right:20px;background:rgba(255,255,255,0.15);border:none;color:white;font-size:1.8rem;cursor:pointer;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">✕</button>';
        overlay.addEventListener('click', function(e) { if (e.target === overlay) closeZoom(); });
        document.body.appendChild(overlay);
    }
    document.getElementById('zoom-img').src = src;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeZoom() {
    var overlay = document.getElementById('zoom-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

(function() {
    var copyBtn = document.getElementById('seo-copy-btn');
    var fbBtn = document.getElementById('seo-fb-btn');
    var waBtn = document.getElementById('seo-wa-btn');
    var pageUrl = window.location.href;
    var productName = $(ConvertTo-Json $title);

    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            var btn = this;
            navigator.clipboard.writeText(pageUrl).then(function() {
                var orig = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                btn.style.background = '#d1fae5';
                setTimeout(function() { btn.innerHTML = orig; btn.style.background = ''; }, 2000);
            });
        });
    }

    if (fbBtn) {
        fbBtn.addEventListener('click', function() {
            window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageUrl), '_blank', 'width=600,height=400');
        });
    }

    if (waBtn) {
        waBtn.addEventListener('click', function() {
            var msg = 'Check out this IC at IC House: *' + productName + '* | ' + pageUrl;
            window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
        });
    }
})();
</script>
"@

    $page = $cleanBaseHtml
    $page = [System.Text.RegularExpressions.Regex]::Replace($page, '(?s)<title>.*?</title>', "<title>$fullTitle</title>")
    $page = [System.Text.RegularExpressions.Regex]::Replace($page, '(?s)<meta name="description"\s+content=".*?"', "<meta name=`"description`" content=`"$seoDesc`"")
    $page = [System.Text.RegularExpressions.Regex]::Replace($page, '(?s)<link rel="canonical"\s+href=".*?"', "<link rel=`"canonical`" href=`"$pUrl`"")

    $page = $page.Replace('property="og:url" content=""', "property=`"og:url`" content=`"$pUrl`"")
    $page = [System.Text.RegularExpressions.Regex]::Replace($page, 'property="og:title" id="og-title"\s+content=".*?"', "property=`"og:title`" id=`"og-title`" content=`"$fullTitle`"")
    $page = [System.Text.RegularExpressions.Regex]::Replace($page, 'property="og:description" id="og-desc"\s+content=".*?"', "property=`"og:description`" id=`"og-desc`" content=`"$seoDesc`"")
    $page = [System.Text.RegularExpressions.Regex]::Replace($page, 'property="og:image" id="og-image"\s+content=".*?"', "property=`"og:image`" id=`"og-image`" content=`"$image`"")

    # Fix relative paths for nested depth
    $depth = ($pDir -split '[\\/]').Count
    $prefix = "../" * $depth
    $page = [System.Text.RegularExpressions.Regex]::Replace($page, 'src="(?!(https?:|//|data:))/?([^"]+)"', "src=""$prefix`$2""")
    $page = [System.Text.RegularExpressions.Regex]::Replace($page, 'href="(?!(https?:|//|mailto:|tel:|#|data:))/?([^"]+)"', "href=""$prefix`$2""")

    $page = [System.Text.RegularExpressions.Regex]::Replace($page, '<body', "<body class=""standalone-product-page"" data-product-id=""$id""")

    # Inject SEO Product Block
    $navRegex = [System.Text.RegularExpressions.Regex]::new('</nav>')
    if ($navRegex.IsMatch($page)) {
        $page = $navRegex.Replace($page, "</nav>`n$seoProductBlock", 1)
    } else {
        $page = $page.Replace('<body', "$seoProductBlock`n<body")
    }

    $targetFile = Join-Path $pDir "index.html"
    Set-Content -Path $targetFile -Value $page -Encoding UTF8
    Write-Host "✅ Generated full rich product page: $targetFile"
}

Write-Host "🎉 Finished generating all product pages!"
