// PM2 Ecosystem — SIAF Nóminas
// Producción: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [{
    name: 'siaf-nominas',
    script: './src/index.js',
    cwd: '/var/www/siaf-nominas/server',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    out_file: '/var/log/pm2/siaf-nominas-out.log',
    error_file: '/var/log/pm2/siaf-nominas-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    min_uptime: '4s',
    max_restarts: 10,
    restart_delay: 3000,
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
  }]
};
