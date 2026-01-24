@echo off
echo ================================
echo SIAF - Instalacion del Frontend
echo ================================
echo.

cd /d C:\Users\Darcketo\Desktop\SIAF\client

echo Instalando dependencias del frontend...
echo Esto puede tomar varios minutos...
echo.

call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Dependencias instaladas correctamente
    echo.
    echo Copiando archivo de configuracion...
    if not exist .env (
        copy .env.example .env
        echo [OK] Archivo .env creado
    ) else (
        echo [INFO] El archivo .env ya existe
    )
    echo.
    echo ====================================
    echo Instalacion completada exitosamente
    echo ====================================
    echo.
    echo Para iniciar el frontend, ejecuta:
    echo   npm start
    echo.
) else (
    echo.
    echo [ERROR] Hubo un error al instalar las dependencias
    echo.
)

pause
