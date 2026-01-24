@echo off
echo ================================
echo SIAF - Iniciando Frontend
echo ================================
echo.

cd /d C:\Users\Darcketo\Desktop\SIAF\client

echo Verificando .env...
if not exist .env (
    echo Creando .env desde .env.example...
    copy .env.example .env
)

echo.
echo Iniciando aplicacion React...
echo La aplicacion se abrira automaticamente en http://localhost:3000
echo.
echo Credenciales por defecto:
echo   Email: admin@siaf.com
echo   Contrasena: admin123
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

call npm start
