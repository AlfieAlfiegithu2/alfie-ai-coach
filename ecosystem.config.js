/**
 * PM2 Ecosystem Configuration
 * Manages both the main English AIdol app and Sentence Mastery (Earthworm)
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      // Main Application (English AIdol)
      name: 'english-aidol-main',
      script: 'pnpm',
      args: '--filter main preview',
      cwd: '/path/to/alfie-ai-coach-1',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: '5173',
      },
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      error_file: './logs/main-error.log',
      out_file: './logs/main-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      // Sentence Mastery (Earthworm)
      name: 'sentence-mastery',
      script: 'pnpm',
      args: '--filter earthworm preview',
      cwd: '/path/to/alfie-ai-coach-1',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOST: '0.0.0.0',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      error_file: './logs/earthworm-error.log',
      out_file: './logs/earthworm-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'your_user',
      host: 'your_server.com',
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/alfie-ai-coach-1.git',
      path: '/var/www/english-aidol',
      'post-deploy': 'pnpm install && pnpm run build:all && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production..."',
    },
  },
};
