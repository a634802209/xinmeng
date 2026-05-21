module.exports = {
  apps: [
    {
      name: 'xinmeng-ai-api',
      script: './api/server.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        JWT_SECRET: 'xinmeng-ai-secret-key-2026',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 自动重启
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      // 内存限制
      max_memory_restart: '1G',
      // 健康检查
      listen_timeout: 10000,
      kill_timeout: 5000,
      // 启动等待
      wait_ready: true,
      // 崩溃后延迟重启
      restart_delay: 3000,
    },
  ],

  deploy: {
    production: {
      user: 'root',
      host: '129.204.225.231',
      ref: 'origin/main',
      repo: '',
      path: '/opt/xinmeng-ai',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
    },
  },
}
