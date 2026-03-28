@echo off
echo Starting Siege...

:: Start Backend
start "Siege Backend" cmd /k "cd backend && echo Installing Python dependencies... && py -m pip install -r requirements.txt && echo Starting Backend... && py main.py || pause"

:: Start Frontend
start "Siege Frontend" cmd /k "cd frontend && echo Installing Node dependencies... && npm install && echo Starting Frontend... && npm run dev || pause"

echo.
echo App launching in separate windows!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
