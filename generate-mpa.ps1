$SITE_URL = "https://ichouse.lk/"
$PROJECT_ID = "pubudueshop-cde28"
$API_KEY = "AIzaSyDl9N6YmDJI9bhhdkeUQPUxWKxIhZhryus"
$LAST_MOD = (Get-Date).ToString("yyyy-MM-dd")

$lt = [char]60
$gt = [char]62
$amp = [char]38

function Get-Slug([string]$title, [string]$id) {
    if (-not $title) { return $id }
    $s = $title.ToLower() -replace '[^a-z0-9 ]', ''
    $s = $s -replace ' ', '-'
    $s = $s.Trim('-')
    if ($s.Length -gt 50) { $s = $s.Substring(0, 50).Trim('-') }
    if ($id) { return $s + "-" + $id } else { return $s }
}

$inventoryUrl = "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/shop/inventory?key=$API_KEY"
$resp = Invoke-RestMethod -Uri $inventoryUrl -Method Get
$prods = $resp.fields.products.arrayValue.values

if (Test-Path "products") { Remove-Item "products" -Recurse -Force }
New-Item -ItemType Directory -Path "products" -Force | Out-Null

$base = Get-Content "index.html" -Raw

$urls = New-Object System.Collections.Generic.List[string]

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
    $pUrl = $SITE_URL + "products/" + $slug + "/"
    $pPath = "products/" + $slug
    New-Item -ItemType Directory -Path $pPath -Force | Out-Null
    
    $cleanDesc = $desc -replace '"', '\"' -replace "\r\n", " " -replace "\n", " "
    $shortDesc = if ($cleanDesc.Length -gt 160) { $cleanDesc.Substring(0, 157) + "..." } else { $cleanDesc }

    $page = $base
    # Update Critical SEO Tags
    $page = $page -replace '(?s)<title>.*?</title>', ("<title>$title | ichouse.lk</title>")
    $page = $page -replace '(?s)<meta name="description"\s+content=".*?"', ("<meta name=`"description`" content=`"$shortDesc`"")
    $page = $page -replace '(?s)<link rel="canonical"\s+href=".*?"', ("<link rel=`"canonical`" href=`"$pUrl`"")
    
    # OG Tags
    $page = $page -replace '(?s)<meta property="og:url"\s+content=".*?"', ("<meta property=`"og:url`" content=`"$pUrl`"")
    $page = $page -replace '(?s)<meta property="og:title"\s+id="og-title"\s+content=".*?"', ("<meta property=`"og:title`" id=`"og-title`" content=`"$title`"")
    $page = $page -replace '(?s)<meta property="og:description"\s+id="og-desc"\s+content=".*?"', ("<meta property=`"og:description`" id=`"og-desc`" content=`"$shortDesc`"")
    $page = $page -replace '(?s)<meta property="og:image"\s+id="og-image"\s+content=".*?"', ("<meta property=`"og:image`" id=`"og-image`" content=`"$img`"")
    
    # Twitter
    $page = $page -replace '(?s)<meta property="twitter:url"\s+content=".*?"', ("<meta property=`"twitter:url`" content=`"$pUrl`"")
    $page = $page -replace '(?s)<meta property="twitter:title"\s+id="tw-title"\s+content=".*?"', ("<meta property=`"twitter:title`" id=`"tw-title`" content=`"$title`"")
    $page = $page -replace '(?s)<meta property="twitter:description"\s+id="tw-desc"\s+content=".*?"', ("<meta property=`"twitter:description`" id=`"tw-desc`" content=`"$shortDesc`"")
    $page = $page -replace '(?s)<meta property="twitter:image"\s+id="tw-image"\s+content=".*?"', ("<meta property=`"twitter:image`" id=`"tw-image`" content=`"$img`"")

    # Structured Data (JSON-LD)
    $jsonLD = @"
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "$title",
      "image": "$img",
      "description": "$shortDesc",
      "brand": { "@type": "Brand", "name": "ichouse.lk" },
      "offers": {
        "@type": "Offer",
        "url": "$pUrl",
        "priceCurrency": "LKR",
        "price": "$price",
        "availability": "https://schema.org/InStock"
      }
    }
"@
    $page = $page.Replace($lt + 'script type="application/ld+json" id="product-structured-data"' + $gt + $lt + '/script' + $gt, $lt + 'script type="application/ld+json" id="product-structured-data"' + $gt + $jsonLD + $lt + '/script' + $gt)

    # Behavior
    $page = $page.Replace('id="product-modal-root" class="product-modal hidden"', 'id="product-modal-root" class="product-modal"')
    $page = $page.Replace($lt + 'header class="hero"' + $gt, $lt + 'header class="hero" style="display:none;"' + $gt)
    $page = $page.Replace('id="home-featured"', 'id="home-featured" style="display:none;"')

    $page | Out-File -FilePath ($pPath + "/index.html") -Encoding utf8
    $urls.Add($pUrl)
}

# Categories
if (Test-Path "category") { Remove-Item "category" -Recurse -Force }
New-Item -ItemType Directory -Path "category" -Force | Out-Null

$cats = @{}
$cats["Microcontrollers"] = @("Arduino Compatible", "ESP8266 Series", "ESP32 Series", "Raspberry Pi", "STM32 Boards")
$cats["Modules"] = @("Relay Modules", "Bluetooth Modules", "WiFi Modules", "GPS Modules", "Motor Drivers")
$cats["Power & Volt"] = @("12V Adapters", "24V Adapters", "5V Adapters", "Adjustable Power Supply", "Transformers")
$cats["Passive Components"] = @("Resistors", "Capacitors", "Inductors", "Potentiometers", "Diodes")
$cats["Sensors"] = @("Temperature & Humidity", "Motion Sensors", "Distance Sensors", "Gas Sensors")

foreach ($cKey in $cats.Keys) {
    $cSlug = Get-Slug $cKey ""
    $cPath = "category/" + $cSlug
    New-Item -ItemType Directory -Path $cPath -Force | Out-Null
    $cUrl = $SITE_URL + "category/" + $cSlug + "/"
    $urls.Add($cUrl)
    
    $cPage = $base
    $cPage = $cPage -replace ($lt + 'title' + $gt + '.*' + $lt + '/title' + $gt), ($lt + 'title' + $gt + $cKey + " | ichouse.lk" + $lt + '/title' + $gt)
    $cPage = $cPage -replace 'href="https://ichouse.lk/"', ('href="' + $cUrl + '"')
    $cPage = $cPage.Replace($lt + "body" + $gt, $lt + "body" + $gt + $lt + "script" + $gt + "window.initialCategory='" + $cKey + "';" + $lt + "/script" + $gt)
    $cPage | Out-File -FilePath ($cPath + "/index.html") -Encoding utf8
    
    foreach ($sName in $cats[$cKey]) {
        $sSlug = Get-Slug $sName ""
        $sPath = $cPath + "/" + $sSlug
        New-Item -ItemType Directory -Path $sPath -Force | Out-Null
        $sUrl = $SITE_URL + "category/" + $cSlug + "/" + $sSlug + "/"
        $urls.Add($sUrl)
        
        $sPage = $base
        $sPage = $sPage -replace ($lt + 'title' + $gt + '.*' + $lt + '/title' + $gt), ($lt + 'title' + $gt + $sName + " | ichouse.lk" + $lt + '/title' + $gt)
        $sPage = $sPage -replace 'href="https://ichouse.lk/"', ('href="' + $sUrl + '"')
        $sPage = $sPage.Replace($lt + "body" + $gt, $lt + "body" + $gt + $lt + "script" + $gt + "window.initialCategory='" + $cKey + "'; window.initialSubCategory='" + $sName + "';" + $lt + "/script" + $gt)
        $sPage | Out-File -FilePath ($sPath + "/index.html") -Encoding utf8
    }
}

# Generate Sitemap.xml in the same script for consistency
$xml = '<?xml version="1.0" encoding="UTF-8"?>' + "`r`n"
$xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "`r`n"
$xml += '  <url>' + "`r`n"
$xml += '    <loc>' + $SITE_URL + '</loc>' + "`r`n"
$xml += '    <lastmod>' + $LAST_MOD + '</lastmod>' + "`r`n"
$xml += '    <priority>1.0</priority>' + "`r`n"
$xml += '  </url>' + "`r`n"

foreach ($url in $urls) {
    $xml += '  <url>' + "`r`n"
    $xml += '    <loc>' + $url + '</loc>' + "`r`n"
    $xml += '    <lastmod>' + $LAST_MOD + '</lastmod>' + "`r`n"
    $xml += '    <priority>0.8</priority>' + "`r`n"
    $xml += '  </url>' + "`r`n"
}
$xml += '</urlset>'
$xml | Out-File -FilePath "sitemap.xml" -Encoding utf8

Write-Host "Success: Transformation Complete and Sitemap Generated!" -ForegroundColor Green

