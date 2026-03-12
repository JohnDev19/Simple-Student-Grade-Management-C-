@echo off
echo ╔══════════════════════════════════════╗
echo ║    Student Grade Manager Launcher    ║
echo ╚══════════════════════════════════════╝
echo.

dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] .NET SDK not found!
    echo Please install .NET 8.0 SDK from: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo [OK] .NET SDK found
echo [*] Building project...
dotnet build -c Release --nologo -v quiet

if %errorlevel% neq 0 (
    echo [ERROR] Build failed. Check the errors above.
    pause
    exit /b 1
)

echo [OK] Build successful
echo [*] Starting server at http://localhost:5050
echo [*] Open your browser and go to: http://localhost:5050
echo [*] Press Ctrl+C to stop the server
echo.

dotnet run --project StudentGradeManager.csproj -c Release
pause
