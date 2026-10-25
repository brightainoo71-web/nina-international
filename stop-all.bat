@echo off
title Nina International - Stop Services
echo Stopping all running Node processes for Nina International...
taskkill /F /IM node.exe /T
echo Done! All servers stopped.
pause
