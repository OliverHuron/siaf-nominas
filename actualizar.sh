#!/bin/bash
echo "🚀 Actualizando SIAF..."

# 1. Actualizar Backend
echo "🔄 Reiniciando API..."
pm2 restart siaf-backend

# 2. Actualizar Frontend
echo "🏗️ Construyendo React..."
cd /var/www/SIAF/client
npm run build

echo "✅ ¡Listo! Cambios aplicados."
