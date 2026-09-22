module.exports = {
  apps: [
    {
      name: 'simvorae-api',
      script: './src/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '750M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
