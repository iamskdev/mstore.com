@echo off
echo Killing existing processes on development ports...

REM Kill processes on port 3000 (Live Server)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing process %%a on port 3000
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill processes on port 8090 (Firestore)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8090') do (
    echo Killing process %%a on port 8090
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill processes on port 9099 (Auth)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9099') do (
    echo Killing process %%a on port 9099
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill processes on port 5000 (Hosting)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Killing process %%a on port 5000
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill processes on port 4000 (UI)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
    echo Killing process %%a on port 4000
    taskkill /PID %%a /F >nul 2>&1
)

echo Port cleanup completed
timeout /t 2 /nobreak > nul