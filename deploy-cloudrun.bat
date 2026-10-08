@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo        GitRoast - Google Cloud Run Deployment
echo ========================================================
echo.

:: 1. Check if gcloud is installed
where gcloud >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 'gcloud' CLI is not found in your PATH.
    echo Please install Google Cloud SDK or run this command in Google Cloud Shell.
    echo Visit: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

:: 2. Prompt for Project ID if not set
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set CURRENT_PROJECT=%%i

if "%CURRENT_PROJECT%"=="" (
    set /p PROJECT_ID="Enter your Google Cloud Project ID: "
    gcloud config set project !PROJECT_ID!
) else (
    echo Current active project: %CURRENT_PROJECT%
    set /p CONFIRM="Use this project? (Y/n): "
    if /i "!CONFIRM!"=="n" (
        set /p PROJECT_ID="Enter your Google Cloud Project ID: "
        gcloud config set project !PROJECT_ID!
    )
)

:: 3. Select Region
set REGION=us-central1
set /p USER_REGION="Enter Cloud Run region (default: us-central1): "
if not "!USER_REGION!"=="" set REGION=!USER_REGION!

echo.
echo ========================================================
echo Deploying GitRoast to Google Cloud Run...
echo Region: %REGION%
echo Allowing unauthenticated public access (--allow-unauthenticated)
echo ========================================================
echo.

gcloud run deploy gitroast ^
  --source . ^
  --region %REGION% ^
  --platform managed ^
  --allow-unauthenticated ^
  --port 8080 ^
  --set-env-vars ENABLE_OFFLINE_AI_FALLBACK=True

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] GitRoast is now live on Google Cloud Run!
    echo Anyone can access it from their phone, tablet, or PC worldwide.
) else (
    echo.
    echo [ERROR] Deployment failed. Check the error log above.
)

endlocal
