#!/usr/bin/env pwsh
# Pull and push

Write-Host "Pulling from GitHub..."
git pull origin main --no-edit

Write-Host "Pushing to GitHub..."
git push origin main

Write-Host "Done! Category highlighting fix deployed."
