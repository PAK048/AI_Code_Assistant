/**
 * Production-ready Logger Utility
 * Provides structured logging with different levels and context
 */

const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
  TRACE: "TRACE",
};

const LOG_COLORS = {
  ERROR: "\x1b[31m", // Red
  WARN: "\x1b[33m", // Yellow
  INFO: "\x1b[36m", // Cyan
  DEBUG: "\x1b[35m", // Magenta
  TRACE: "\x1b[37m", // White
  RESET: "\x1b[0m",
};

class Logger {
  constructor(context = "App") {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV !== "production";
    this.logLevel =
      process.env.LOG_LEVEL || (this.isDevelopment ? "DEBUG" : "INFO");
    this.enableColors = process.env.ENABLE_LOG_COLORS !== "false";
  }

  /**
   * Check if a log level should be logged based on current log level
   */
  shouldLog(level) {
    const levels = Object.keys(LOG_LEVELS);
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Format log message with timestamp, level, and context
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const color = this.enableColors ? LOG_COLORS[level] : "";
    const reset = this.enableColors ? LOG_COLORS.RESET : "";

    const logObject = {
      timestamp,
      level,
      context: this.context,
      message,
      ...meta,
    };

    if (this.isDevelopment) {
      // Colorful console output for development
      return {
        prefix: `${color}[${timestamp}] [${level}] [${this.context}]${reset}`,
        logObject,
      };
    } else {
      // JSON output for production (easy to parse by log aggregators)
      return {
        prefix: null,
        logObject: JSON.stringify(logObject),
      };
    }
  }

  /**
   * Log error messages
   */
  error(message, error = null, meta = {}) {
    if (!this.shouldLog("ERROR")) return;

    const errorMeta = error
      ? {
          error: {
            message: error.message,
            stack: error.stack,
            code: error.code,
            ...error,
          },
          ...meta,
        }
      : meta;

    const { prefix, logObject } = this.formatMessage(
      "ERROR",
      message,
      errorMeta
    );

    if (prefix) {
      console.error(prefix, message, errorMeta);
    } else {
      console.error(logObject);
    }
  }

  /**
   * Log warning messages
   */
  warn(message, meta = {}) {
    if (!this.shouldLog("WARN")) return;

    const { prefix, logObject } = this.formatMessage("WARN", message, meta);

    if (prefix) {
      console.warn(prefix, message, meta);
    } else {
      console.warn(logObject);
    }
  }

  /**
   * Log info messages
   */
  info(message, meta = {}) {
    if (!this.shouldLog("INFO")) return;

    const { prefix, logObject } = this.formatMessage("INFO", message, meta);

    if (prefix) {
      console.info(prefix, message, meta);
    } else {
      console.info(logObject);
    }
  }

  /**
   * Log debug messages
   */
  debug(message, meta = {}) {
    if (!this.shouldLog("DEBUG")) return;

    const { prefix, logObject } = this.formatMessage("DEBUG", message, meta);

    if (prefix) {
      console.log(prefix, message, meta);
    } else {
      console.log(logObject);
    }
  }

  /**
   * Log trace messages (very detailed)
   */
  trace(message, meta = {}) {
    if (!this.shouldLog("TRACE")) return;

    const { prefix, logObject } = this.formatMessage("TRACE", message, meta);

    if (prefix) {
      console.log(prefix, message, meta);
    } else {
      console.log(logObject);
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(req, meta = {}) {
    this.info("HTTP Request", {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      ...meta,
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(req, res, duration, meta = {}) {
    const level =
      res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";

    this[level.toLowerCase()]("HTTP Response", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ...meta,
    });
  }

  /**
   * Log database operations
   */
  logDatabase(operation, collection, meta = {}) {
    this.debug("Database Operation", {
      operation,
      collection,
      ...meta,
    });
  }

  /**
   * Log API calls to external services
   */
  logExternalAPI(service, endpoint, method, meta = {}) {
    this.debug("External API Call", {
      service,
      endpoint,
      method,
      ...meta,
    });
  }

  /**
   * Log WebSocket events
   */
  logWebSocket(event, meta = {}) {
    this.debug("WebSocket Event", {
      event,
      ...meta,
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(childContext) {
    return new Logger(`${this.context}:${childContext}`);
  }
}

/**
 * Express middleware for request/response logging
 */
function requestLoggerMiddleware(logger) {
  return (req, res, next) => {
    const startTime = Date.now();

    // Log request
    logger.logRequest(req);

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - startTime;
      logger.logResponse(req, res, duration);
      originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Global error handler middleware
 */
function errorLoggerMiddleware(logger) {
  return (err, req, res, next) => {
    logger.error("Unhandled Error", err, {
      method: req.method,
      url: req.url,
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (res.headersSent) {
      return next(err);
    }

    res.status(err.status || 500).json({
      error: {
        message:
          process.env.NODE_ENV === "production"
            ? "Internal Server Error"
            : err.message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
      },
    });
  };
}

// Create default logger instance
const defaultLogger = new Logger("CodeEcho");

module.exports = {
  Logger,
  logger: defaultLogger,
  requestLoggerMiddleware,
  errorLoggerMiddleware,
  LOG_LEVELS,
};
