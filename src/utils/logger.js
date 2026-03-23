const { createLogger, format, transports } = require('winston');

/**
 * Structured logger using Winston.
 * - In development: colourised console output
 * - In production: JSON to stdout (easily ingested by Datadog, CloudWatch, etc.)
 */
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production'
      ? format.json()
      : format.combine(
          format.colorize(),
          format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
        )
  ),
  transports: [new transports.Console()],
});

module.exports = logger;