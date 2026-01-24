module.exports = {
  apps: [{
    name: 'siaf-server',
    script: './src/index.js',
    cwd: '/root/SIAF/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      CLIENT_URL: 'http://31.97.210.189',
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_NAME: 'siaf_production',
      DB_USER: 'siaf_admin',
      DB_PASSWORD: 'SiafProd2024!Secure#',
      DB_SSL: 'false',
      JWT_SECRET: 'k8mN9pQ2rT5yU8xA1bC4dE7fG0hI3jK6lM9nO2pS5tV8wX1zA4bC7eF0gI3jK6mN9',
      JWT_EXPIRE: '7d',
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: 587,
      SMTP_SECURE: 'false',
      SMTP_USER: 'sistema.siaf@gmail.com',
      SMTP_FROM: 'SIAF Sistema <sistema.siaf@gmail.com>',
      MAX_FILE_SIZE: 10485760,
      UPLOAD_PATH: '/var/www/siaf/uploads',
      USE_SSL: 'false',
      TRUST_PROXY: 'true',
      RATE_LIMIT_WINDOW_MS: 900000,
      RATE_LIMIT_MAX_REQUESTS: 100
    }
  }]
}
