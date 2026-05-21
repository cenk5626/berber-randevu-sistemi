@echo off
cd /d "%~dp0"

echo Gerekli paketler yukleniyor...
pip install -r requirements.txt --quiet

echo WhatsApp Bot API baslatiliyor...
echo Chrome penceresi acilacak, QR kodu tarayin.
echo Bot calismaya devam edecek, pencereyi kapatmayin!
echo.

python api_server.py

if errorlevel 1 (
    echo.
    echo Bot hata ile sonlandi!
    pause
)
