#!/usr/bin/env pwsh
$count = 0
Get-ChildItem -Recurse -Filter "index.html" | Where-Object {
    $_.DirectoryName -ne (Get-Location).Path
} | ForEach-Object {
    $text = [System.IO.File]::ReadAllText($_.FullName)
    if ($text.Contains("addToCart('' + p.id + '', 1)")) {
        $fixed = $text.Replace("addToCart('' + p.id + '', 1)", "addToCart('+p.id+',1)")
        [System.IO.File]::WriteAllText($_.FullName, $fixed, [System.Text.Encoding]::UTF8)
        $count++
    }
}
Write-Host "Fixed $count files"
