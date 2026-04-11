@echo off
set GIT_EDITOR=true
git commit --no-edit --allow-empty-message
git add -A
git commit -m "Fix category highlighting - read from history state"
git push origin main
echo Done!
pause
