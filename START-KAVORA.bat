@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 20+ is required.&pause&exit /b 1)
if not exist node_modules call npm install
start "" http://localhost:10000
npm start
