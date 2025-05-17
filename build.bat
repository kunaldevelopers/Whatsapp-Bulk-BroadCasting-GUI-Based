@echo off
echo Building WhatsApp Bulk Messenger Application...
echo.
echo This version includes session persistence - no need to scan QR code every time.
echo.
echo Step 1: Installing dependencies...
call npm install
echo.
echo Step 2: Building the application...
call npm run dist
echo.
echo Build process completed! Check the 'dist' folder for the installer.
echo.
pause
