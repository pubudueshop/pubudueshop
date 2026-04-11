#!/usr/bin/env pwsh
# Push title removal change

Write-Host "Adding changes..."
git add -A

Write-Host "Committing..."
git commit -m "Remove 'High-Quality' from home page hero title"

Write-Host "Pushing to GitHub..."
git push origin main

Write-Host "Done! Title updated."
