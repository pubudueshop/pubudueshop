@echo off
git -c core.editor="cmd /c exit 0" commit --no-edit
if errorlevel 1 (
    echo Merge commit failed, trying alternative method
    for /f %%i in ('git write-tree') do set TREE=%%i
    for /f %%i in ('git rev-parse HEAD') do set PARENT1=%%i
    for /f %%i in ('type .git\MERGE_HEAD') do set PARENT2=%%i
    for /f %%i in ('git commit-tree %TREE% -p %PARENT1% -p %PARENT2% -m "Merge remote changes"') do set COMMIT=%%i
    git update-ref HEAD %COMMIT%
    del .git\MERGE_HEAD .git\MERGE_MODE .git\ORIG_HEAD 2>nul
    echo Merge completed
)
git status
