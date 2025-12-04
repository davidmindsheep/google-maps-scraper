@echo off
echo Launching Google Chrome for Scraper...
echo Closing existing Chrome instances...
taskkill /F /IM chrome.exe /T >nul 2>&1

set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if not exist "%CHROME_PATH%" (
    echo Chrome not found in standard locations.
    echo Please ensure Chrome is installed.
    pause
    exit /b
)

echo Found Chrome at: "%CHROME_PATH%"
echo Starting Chrome with remote debugging on port 9222...
start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug-profile"

echo.
echo Chrome launched! You can now run the scraper.
echo.
pause
