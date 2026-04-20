Set-Location "D:\OFFICE LETTER\OneDrive - Sri Lanka Police\Desktop\PubuduEshop"

# Clean up any stuck git state
Remove-Item -Recurse -Force ".git\rebase-merge" -ErrorAction SilentlyContinue
Remove-Item -Force ".git\MERGE_HEAD" -ErrorAction SilentlyContinue
Remove-Item -Force ".git\MERGE_MSG" -ErrorAction SilentlyContinue
Remove-Item -Force ".git\ORIG_HEAD" -ErrorAction SilentlyContinue

Write-Output "Git state cleaned"
git status --short | Select-Object -First 5

# Force push our local version (our fixes are correct)
Write-Output "Force pushing to origin main..."
git push origin main --force

Write-Output "DONE"
