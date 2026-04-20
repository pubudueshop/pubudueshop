# Complete merge and push
Write-Host "Completing merge..."

# Set git editor to avoid vim
$env:GIT_EDITOR = "true"

# Complete the merge
git commit --no-edit --allow-empty-message 2>&1 | Out-Null

# Add all changes
git add -A

# Commit the category fix
git commit -m "Fix category highlighting - read from history state"

# Push to remote
git push origin main

Write-Host "Done! Changes pushed to GitHub."
