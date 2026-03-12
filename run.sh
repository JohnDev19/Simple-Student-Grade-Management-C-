#!/bin/bash
echo "╔══════════════════════════════════════╗"
echo "║    Student Grade Manager Launcher    ║"
echo "╚══════════════════════════════════════╝"
echo

# dotnet
if ! command -v dotnet &> /dev/null; then
    echo "[ERROR] .NET SDK not found!"
    echo "Install from: https://dotnet.microsoft.com/download"
    exit 1
fi

echo "[OK] .NET SDK found: $(dotnet --version)"
echo "[*] Building project..."
dotnet build -c Release --nologo -v quiet

if [ $? -ne 0 ]; then
    echo "[ERROR] Build failed."
    exit 1
fi

echo "[OK] Build successful"
echo "[*] Starting server at http://localhost:5050"
echo "[*] Open browser → http://localhost:5050"
echo "[*] Press Ctrl+C to stop"
echo

dotnet run --project StudentGradeManager.csproj -c Release
