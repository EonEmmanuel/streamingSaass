module.exports = {
  apps: [
    {
      name: 'streaming-api',
      script: './dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'srs',
      script: '/usr/local/srs/objs/srs',
      args: '-c /usr/local/srs/conf/srs.conf',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      // SRS manages its own logging; pipe stdout/stderr through PM2
      out_file: './logs/srs-out.log',
      error_file: './logs/srs-error.log',
      merge_logs: true,
    },
  ],
};
