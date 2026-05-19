@echo off
cd /d C:\Users\PETERCGS\horatad

echo [1/3] Reading current version...
powershell -NoProfile -ExecutionPolicy Bypass -File bump_version.ps1
if %errorlevel% neq 0 (
  echo ERROR: Version bump failed -- push cancelled
  pause
  exit /b 1
)

echo.
echo [3/3] Git push...
git add version.json script.js sw.js
git add .
git status
echo.
set /p msg="Commit message: "
if "%msg%"=="" (
  echo ERROR: Commit message required
  pause
  exit /b 1
)
git commit -m "%msg%"
git push
echo.
echo Push complete
pause
