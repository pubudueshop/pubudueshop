$SITE_URL = 'https://ichouse.lk/'
$PROJECT_ID = 'pubudueshop-cde28'
$API_KEY = 'AIzaSyDl9N6YmDJI9bhhdkeUQPUxWKxIhZhryus'
$LAST_MOD = (Get-Date).ToString('yyyy-MM-dd')

Write-Host "🚀 Finalizing SEO MPA Transformation..." -ForegroundColor Cyan

function Get-Slug([string]$title, [string]$id) {
    if (-not $title) { return $id }
    $slug = $title.ToLower() -replace '[^a-z0-9 ]', ''
    $slug = $slug -replace ' ', '-'
    $slug = $slug.Trim('-')
    if ($slug.Length -gt 50) { $slug = $slug.Substring(0, 50).Trim('-') }
    return "${slug}-${id}"
}

# 1. Fetch
$fetchUrl = "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/shop/inventory?key=$API_KEY"
$resp = Invoke-RestMethod -Uri $fetchUrl -Method Get
$prods = $resp.fields.products.arrayValue.values

# 2. Cleanup
if (Test-Path "products") { Remove-Item "products" -Recurse -Force }
New-Item -ItemType Directory -Path "products" -Force | Out-Null

# 3. Template
$base = Get-Content "index.html" -Raw
$base = $base -replace 'href="styles.css"', "href=""$($SITE_URL)styles.css"""
$base = $base -replace 'src="script.js"', "src=""$($SITE_URL)script.js"""
$base = $base -replace 'href="logo.png"', "href=""$($SITE_URL)logo.png"""

# 4. Loop
$urls = New-Object System.Collections.Generic.List[string]
[void]$urls.Add("  <url>`n    <loc>$SITE_URL</loc>`n    <lastmod>$LAST_MOD</lastmod>`n    <priority>1.0</priority>`n  </url>")

foreach ($p in $prods) {
    $f = $p.mapValue.fields
    $id = if ($f.id.integerValue) { $f.id.integerValue } else { $f.id.stringValue }
    $title = $f.title.stringValue
    $desc = if ($f.description.stringValue) { $f.description.stringValue } else { $f.longDescription.stringValue }
    $price = $f.price.integerValue
    $mCat = $f.mainCategory.stringValue
    $sCat = $f.subCategory.stringValue
    $img = if ($f.image.stringValue) { $f.image.stringValue } else { $f.images.arrayValue.values[0].stringValue }

    $slug = Get-Slug $title $id
    $pUrl = "$($SITE_URL)products/$($slug)/"
    $pPath = "products/$($slug)"
    New-Item -ItemType Directory -Path $pPath -Force | Out-Null
    
    # Metadata
    $mTitle = "$title - Buy Online at ichouse.lk"
    $specsText = ""
    if ($f.specs.mapValue.fields) {
        $specs = $f.specs.mapValue.fields
        foreach ($key in $specs.PSObject.Properties.Name) {
            $val = $specs."$key".stringValue
            $specsText += "$($key): $val, "
        }
        $specsText = $specsText.TrimEnd(", ")
    }
    $mDesc = "$mCat Component. $specsText. $desc"
    if ($mDesc.Length -gt 160) { $mDesc = $mDesc.Substring(0, 157) + "..." }

    $page = $base
    $page = $page -replace '(?i)<title>.*?</title>', "<title>$mTitle</title>"
    $page = $page -replace '(?i)name="description" content="[^"]*"', "name=""description"" content=""$($mDesc -replace '"', '&quot;')"""
    $page = $page -replace '(?i)rel="canonical" href="[^"]*"', "rel=""canonical"" href=""$pUrl"""
    $page = $page -replace '(?i)property="og:title" id="og-title" content="[^"]*"', "property=""og:title"" id=""og-title"" content=""$mTitle"""
    $page = $page -replace '(?i)property="og:description" id="og-desc" content="[^"]*"', "property=""og:description"" id=""og-desc"" content=""$($mDesc -replace '"', '&quot;')"""
    $page = $page -replace '(?i)property="og:image" id="og-image" content="[^"]*"', "property=""og:image"" id=""og-image"" content=""$img"""
    
    # JSON-LD
    $ld = '{ "@context": "https://schema.org", "@type": "Product", "name": "' + ($title -replace '"','\"') + '", "description": "' + ($desc -replace '"','\"' -replace "\n", " ") + '", "image": "' + $img + '", "price": "' + $price + '", "url": "' + $pUrl + '" }'
    $page = $page -replace 'id="product-structured-data">', "id=""product-structured-data"">$ld"

    # Pre-render Technical Specs
    $featHtml = ""
    if ($f.features.arrayValue.values) {
        foreach ($v in $f.features.arrayValue.values) { $featHtml += "<li>$($v.stringValue -replace '&', '&amp;' -replace '<', '&lt;')</li>" }
    }
    
    $specHtml = ""
    if ($f.specs.mapValue.fields) {
        $sp = $f.specs.mapValue.fields
        foreach ($k in $sp.PSObject.Properties.Name) {
            $specHtml += "<tr><td>$k</td><td>$($sp."$k".stringValue -replace '&', '&amp;' -replace '<', '&lt;')</td></tr>"
        }
    }

    $page = $page -replace 'id="detail-category"[^>]*>Category</span>', "id=""detail-category"" class=""detail-category"">$mCat > $sCat</span>"
    $page = $page -replace 'id="detail-title">Product Title</h1>', "id=""detail-title"">$title</h1>"
    $page = $page -replace 'id="detail-price"[^>]*>LKR 0</div>', "id=""detail-price"" class=""detail-price"">LKR $price</div>"
    $page = $page -replace 'id="detail-description"[^>]*></div>', "id=""detail-description"" class=""detail-short-desc"">$desc</div>"
    $page = $page -replace 'id="detail-features"[^>]*></ul>', "id=""detail-features"" class=""detail-features-list"">$featHtml</ul>"
    $page = $page -replace 'id="detail-specs-body"></tbody>', "id=""detail-specs-body"">$specHtml</tbody>"
    $page = $page -replace 'id="detail-image" src=""[^>]*>', "id=""detail-image"" src=""$img"" alt=""$title"" class=""detail-main-image"">"

    $page = $page -replace 'id="product-modal-root" class="product-modal hidden"', 'id="product-modal-root" class="product-modal"'
    $page = $page -replace '<header class="hero">', '<header class="hero" style="display:none;">'
    $page = $page -replace 'id="home-featured"', 'id="home-featured" style="display:none;"'

    $page | Out-File -FilePath "$pPath/index.html" -Encoding utf8
    [void]$urls.Add("  <url>`n    <loc>$pUrl</loc>`n    <lastmod>$LAST_MOD</lastmod>`n    <priority>0.8</priority>`n  </url>")
}

# Output files
$xml = '<?xml version="1.0" encoding="UTF-8"?>' + "`n" + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "`n" + ($urls -join "`n") + "`n" + '</urlset>'
$xml | Out-File -FilePath "sitemap.xml" -Encoding utf8

$robots = "User-agent: *`r`nAllow: /`r`nSitemap: $($SITE_URL)sitemap.xml`r`nCrawl-delay: 10"
$robots | Out-File -FilePath "robots.txt" -Encoding utf8

Write-Host "✅ Transformation Complete!" -ForegroundColor Green
