#!/usr/bin/env pwsh
$count = 0

# Get the exact bytes of the old block from a known unpatched file
$sampleFile = "power-adapter\9v-power-adapter\9v-2a-2pin-acdc-power-adapter\index.html"
$sampleTxt = [System.IO.File]::ReadAllText($sampleFile, [System.Text.Encoding]::UTF8)

# Extract old block
$startMarker = "        <!-- Similar Products (injected by JS at runtime) -->"
$endMarker = "        </div>`n    </div>`n</div>"

$si = $sampleTxt.IndexOf($startMarker)
$ei = $sampleTxt.IndexOf("        </div>`n    </div>`n</div>", $si)
if ($ei -lt 0) {
    # Try with \r\n
    $endMarker = "        </div>`r`n    </div>`r`n</div>"
    $ei = $sampleTxt.IndexOf($endMarker, $si)
}

$oldBlock = $sampleTxt.Substring($si, $ei - $si + "        </div>".Length)
Write-Host "Old block ($($oldBlock.Length) chars):"
Write-Host $oldBlock.Substring(0, [Math]::Min(100, $oldBlock.Length))

$newBlock = '        <div class="mt-8 border-t pt-6" id="similar-products-section">
            <h3 class="text-lg font-bold mb-4">Similar Products</h3>
            <div id="similar-products-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4"></div>
        </div>'

Get-ChildItem -Recurse -Filter "index.html" | Where-Object {
    $_.DirectoryName -ne (Get-Location).Path
} | ForEach-Object {
    $txt = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    if ($txt.Contains($oldBlock)) {
        $newTxt = $txt.Replace($oldBlock, $newBlock)
        [System.IO.File]::WriteAllText($_.FullName, $newTxt, [System.Text.Encoding]::UTF8)
        $count++
    }
}
Write-Host "Updated $count files."
