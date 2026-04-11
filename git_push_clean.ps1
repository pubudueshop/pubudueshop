#!/usr/bin/env pwsh
# Fresh git push without merge issues

Write-Host "Adding changes..."
git add -A

Write-Host "Committing..."
git commit -m "Fix category highlighting - read from history state"

Write-Host "Pushing to GitHub..."
git push origin main

Write-Host "Done! Category highlighting fix deployed."
