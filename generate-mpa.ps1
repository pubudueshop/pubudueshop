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
    
    $page = $base
    $page = $page.Replace('id="product-modal-root" class="product-modal hidden"', 'id="product-modal-root" class="product-modal"')
    $page = $page.Replace($lt + 'header class="hero"' + $gt, $lt + 'header class="hero" style="display:none;"' + $gt)
    $page = $page.Replace('id="home-featured"', 'id="home-featured" style="display:none;"')

    $page | Out-File -FilePath ($pPath + "/index.html") -Encoding utf8
}

# Categories
if (Test-Path "category") { Remove-Item "category" -Recurse -Force }
New-Item -ItemType Directory -Path "category" -Force | Out-Null

$pCat = "Power " + $amp + " Volt"
$sCatNav = "Sensors"
$sSense = "Temperature " + $amp + " Humidity"

$cats = @{}
$cats["Microcontrollers"] = @("Arduino Compatible", "ESP8266 Series", "ESP32 Series", "Raspberry Pi", "STM32 Boards")
$cats["Modules"] = @("Relay Modules", "Bluetooth Modules", "WiFi Modules", "GPS Modules", "Motor Drivers")
$cats[$pCat] = @("12V Adapters", "24V Adapters", "5V Adapters", "Adjustable Power Supply", "Transformers")
$cats["Passive Components"] = @("Resistors", "Capacitors", "Inductors", "Potentiometers", "Diodes")
$cats[$sCatNav] = @($sSense, "Motion Sensors", "Distance Sensors", "Gas Sensors")

foreach ($cKey in $cats.Keys) {
    $cSlug = Get-Slug $cKey ""
    $cPath = "category/" + $cSlug
    New-Item -ItemType Directory -Path $cPath -Force | Out-Null
    $cUrl = $SITE_URL + "category/" + $cSlug + "/"
    $cPage = $base.Replace($lt + "body" + $gt, $lt + "body" + $gt + $lt + "script" + $gt + "window.initialCategory='" + $cKey + "';" + $lt + "/script" + $gt)
    $cPage | Out-File -FilePath ($cPath + "/index.html") -Encoding utf8
    
    foreach ($sName in $cats[$cKey]) {
        $sSlug = Get-Slug $sName ""
        $sPath = $cPath + "/" + $sSlug
        New-Item -ItemType Directory -Path $sPath -Force | Out-Null
        $sUrl = $SITE_URL + "category/" + $cSlug + "/" + $sSlug + "/"
        $sPage = $base.Replace($lt + "body" + $gt, $lt + "body" + $gt + $lt + "script" + $gt + "window.initialCategory='" + $cKey + "'; window.initialSubCategory='" + $sName + "';" + $lt + "/script" + $gt)
        $sPage | Out-File -FilePath ($sPath + "/index.html") -Encoding utf8
    }
}

Write-Host "✅ Transformation Complete!" -ForegroundColor Green
