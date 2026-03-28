# backend/run.ps1
Write-Host "Checking Python installation..."
py --version
if ($?) {
    Write-Host "Python found via 'py' launcher."
    Write-Host "Installing dependencies..."
    py -m pip install -r requirements.txt
    if ($?) {
        Write-Host "Starting server..."
        py main.py
    } else {
        Write-Host "Error installing dependencies. Please check your internet connection or Python installation."
        pause
    }
} else {
    Write-Host "Python not found. Please install Python from https://www.python.org/downloads/ and make sure to check 'Add Python to PATH' during installation."
    pause
}
