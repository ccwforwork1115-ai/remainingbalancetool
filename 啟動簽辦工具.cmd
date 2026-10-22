@echo off
cd /d "%~dp0"
if exist ".runtime\python\python.exe" (
  ".runtime\python\python.exe" "document_service.py"
) else (
  py -3 "document_service.py"
)
if errorlevel 1 pause