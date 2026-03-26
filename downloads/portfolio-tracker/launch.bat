@echo off
cd /d %~dp0
start "" "http://localhost:8089"
python server.py
