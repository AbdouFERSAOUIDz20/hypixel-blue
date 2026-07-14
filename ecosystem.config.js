module.exports = {
  apps: [
    {
      name: 'hypixel-proxy',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      interpreter: 'node',
      interpreter_args: '--max-old-space-size=512',

      env: {
        NODE_ENV: 'production',
      },

      // ── Restart Policy ───────────────────────────────────────────────────────
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      min_uptime: '10s',

      // ── Memory Guard ─────────────────────────────────────────────────────────
      max_memory_restart: '400M',

      // ── Logging ──────────────────────────────────────────────────────────────
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_type: 'json',

      // ── Graceful Shutdown ────────────────────────────────────────────────────
      kill_timeout: 5000,
      listen_timeout: 8000,
      shutdown_with_message: false,

      // ── Source Maps ──────────────────────────────────────────────────────────
      source_map_support: true,
    },
  ],
};
