$files = Get-ChildItem -Recurse -Filter "index.html" | Where-Object { $_.DirectoryName -ne (Get-Location).Path }
$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match '<script defer src="/script\.js">') {
        $content = $content -replace '<script defer src="/script\.js">', '<script src="/script.js">'
        Set-Content $file.FullName $content -NoNewline
        $count++
    }
}
Write-Output "Fixed defer on script.js in $count product pages"
