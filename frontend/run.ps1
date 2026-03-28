# frontend/run.ps1
Write-Host "Installing dependencies..."
npm install
if ($?) {
    Write-Host "Starting frontend..."
    npm run dev
} else {
    Write-Host "Error installing dependencies. Please check your Node.js installation."
    pause
}
