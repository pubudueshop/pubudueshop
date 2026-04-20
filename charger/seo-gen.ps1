$SITE_URL = 'https://ichouse.lk/'
$PROJECT_ID = 'pubudueshop-cde28'
$API_KEY = 'AIzaSyDl9N6YmDJI9bhhdkeUQPUxWKxIhZhryus'
$LAST_MOD = (Get-Date).ToString('yyyy-MM-dd')

Write-Host '--- SEO GENERATOR (PowerShell) ---'

$url = 'https://firestore.googleapis.com/v1/projects/' + $PROJECT_ID + '/databases/(default)/documents/shop/inventory?key=' + $API_KEY
Write-Host '📡 Fetching products from Firebase...'

try {
    $response = Invoke-RestMethod -Uri $url -Method Get
    $products = @()
    if ($response.fields.products.arrayValue.values) {
        foreach ($v in $response.fields.products.arrayValue.values) {
            $fields = $v.mapValue.fields
            $id = $fields.id.integerValue
            if (-not $id) { $id = $fields.id.stringValue }
            $cat = $fields.mainCategory.stringValue
            if (-not $cat) { $cat = 'General' }
            $products += [PSCustomObject]@{ id = $id; category = $cat }
        }
    }
    Write-Host ('✅ Extracted ' + $products.Count + ' products.')

    # Generate Robots.txt
    $robots = 'User-agent: *' + "`r`n" + 'Allow: /' + "`r`n" + 'Sitemap: ' + $SITE_URL + 'sitemap.xml' + "`r`n" + 'Crawl-delay: 10'
    $robots | Out-File -FilePath 'robots.txt' -Encoding utf8

    # Generate Sitemap.xml (Line by Line)
    $xmlLines = New-Object System.Collections.Generic.List[string]
    [void]$xmlLines.Add('<?xml version="1.0" encoding="UTF-8"?>')
    [void]$xmlLines.Add('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    # Homepage
    [void]$xmlLines.Add('  <url>')
    [void]$xmlLines.Add('    <loc>' + $SITE_URL + '</loc>')
    [void]$xmlLines.Add('    <lastmod>' + $LAST_MOD + '</lastmod>')
    [void]$xmlLines.Add('    <priority>1.0</priority>')
    [void]$xmlLines.Add('  </url>')

    # Categories
    $categories = $products | Select-Object -ExpandProperty category -Unique
    foreach ($cat in $categories) {
        if ($cat) {
            $encodedCat = [System.Uri]::EscapeDataString($cat)
            [void]$xmlLines.Add('  <url>')
            [void]$xmlLines.Add('    <loc>' + $SITE_URL + '?category=' + $encodedCat + '</loc>')
            [void]$xmlLines.Add('    <lastmod>' + $LAST_MOD + '</lastmod>')
            [void]$xmlLines.Add('    <priority>0.8</priority>')
            [void]$xmlLines.Add('  </url>')
        }
    }

    # Products
    foreach ($prod in $products) {
        if ($prod.id) {
            [void]$xmlLines.Add('  <url>')
            [void]$xmlLines.Add('    <loc>' + $SITE_URL + '?product=' + $prod.id + '</loc>')
            [void]$xmlLines.Add('    <lastmod>' + $LAST_MOD + '</lastmod>')
            [void]$xmlLines.Add('    <priority>0.7</priority>')
            [void]$xmlLines.Add('  </url>')
        }
    }

    [void]$xmlLines.Add('</urlset>')
    $xmlLines | Out-File -FilePath 'sitemap.xml' -Encoding utf8
    Write-Host '✅ sitemap.xml saved!'
    Write-Host '✨ Done!'
} catch {
    Write-Host ('❌ Failed: ' + $_.Exception.Message)
}
