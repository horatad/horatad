@echo off
cd /d C:\Users\PETERCGS\horatad
git add .
git status
echo.
set /p msg="Commit message: "
git commit -m "%msg%"
git push
echo.
echo Push complete
pause
