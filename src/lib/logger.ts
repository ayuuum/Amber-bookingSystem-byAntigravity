/**
 * Structured Logging with Winston (Node.js) or Console (Edge Runtime)
 * 
 * Provides consistent, structured logging across the application.
 * In production, logs are sent to external services (Datadog, CloudWatch, etc.)
 * 
 * Edge Runtime compatible: Falls back to console logging when Winston is not available
 */

// Check if we're in Edge Runtime (where Node.js APIs like process.nextTick are not available)
const isEdgeRuntime = (() => {
    try {
        // Edge Runtime doesn't have process.nextTick
        // Check for process.nextTick specifically as it's used by Winston
        if (typeof process === 'undefined') return true;
        if (typeof process.nextTick !== 'function') return true;
        // Additional check: Edge Runtime may have process but not all Node.js APIs
        if (typeof process.versions === 'undefined') return true;
        return false;
    } catch {
        return true;
    }
})();

// Simple console logger for Edge Runtime
const createEdgeLogger = () => {
    const getEnv = (key: string, defaultValue?: string): string | undefined => {
        try {
            return typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
        } catch {
            return undefined;
        }
    };

    const level = getEnv('LOG_LEVEL') || (getEnv('NODE_ENV') === 'production' ? 'info' : 'debug');
    
    const formatMessage = (level: string, message: string, meta?: Record<string, unknown>) => {
        const timestamp = new Date().toISOString();
        const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
    };

    const shouldLog = (logLevel: string) => {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(level);
        const logLevelIndex = levels.indexOf(logLevel);
        return logLevelIndex >= currentLevelIndex;
    };

    return {
        level,
        info: (message: string, meta?: Record<string, unknown>) => {
            if (shouldLog('info')) {
                console.log(formatMessage('info', message, meta));
            }
        },
        error: (message: string, meta?: Record<string, unknown>) => {
            if (shouldLog('error')) {
                console.error(formatMessage('error', message, meta));
            }
        },
        warn: (message: string, meta?: Record<string, unknown>) => {
            if (shouldLog('warn')) {
                console.warn(formatMessage('warn', message, meta));
            }
        },
        debug: (message: string, meta?: Record<string, unknown>) => {
            if (shouldLog('debug')) {
                console.debug(formatMessage('debug', message, meta));
            }
        },
    };
};

// Winston logger for Node.js Runtime (lazy initialization)
let winstonLogger: any = null;
let winstonInitialized = false;

const initializeWinston = () => {
    if (winstonInitialized) return winstonLogger;
    winstonInitialized = true;

    if (isEdgeRuntime) {
        return null;
    }

    try {
        // Only import winston in Node.js runtime
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const winston = require('winston');
        const { combine, timestamp, errors, json, printf, colorize } = winston.format;

        // Custom format for development (readable console output)
        const devFormat = printf(({ level, message, timestamp, ...meta }: any) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
        });

        winstonLogger = winston.createLogger({
            level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                errors({ stack: true }),
                json()
            ),
            defaultMeta: {
                service: 'amber',
                environment: process.env.NODE_ENV || 'development',
            },
            transports: [
                // Console transport (for all environments)
                new winston.transports.Console({
                    format: process.env.NODE_ENV === 'production'
                        ? combine(json())
                        : combine(
                            colorize(),
                            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                            devFormat
                        ),
                }),
            ],
        });

        // Add file transport in production (optional)
        if (process.env.NODE_ENV === 'production' && process.env.LOG_FILE_PATH) {
            winstonLogger.add(
                new winston.transports.File({
                    filename: process.env.LOG_FILE_PATH,
                    level: 'info',
                })
            );
        }

        return winstonLogger;
    } catch (error) {
        // If Winston fails to load, fall back to edge logger
        console.warn('Winston logger failed to initialize, using console logger:', error);
        return null;
    }
};

// Create logger instance - lazy initialize Winston only in Node.js runtime
const getLogger = () => {
    if (isEdgeRuntime) {
        return createEdgeLogger();
    }
    
    const winston = initializeWinston();
    return winston || createEdgeLogger();
};

// Export logger - use Winston if available, otherwise use Edge logger
export const logger = getLogger();

// Helper functions for common log patterns
export const loggers = {
    /**
     * Log API request
     */
    apiRequest: (method: string, path: string, userId?: string, metadata?: Record<string, unknown>) => {
        logger.info('API Request', {
            type: 'api_request',
            method,
            path,
            userId,
            ...metadata,
        });
    },

    /**
     * Log API response
     */
    apiResponse: (method: string, path: string, statusCode: number, duration: number, metadata?: Record<string, unknown>) => {
        logger.info('API Response', {
            type: 'api_response',
            method,
            path,
            statusCode,
            duration,
            ...metadata,
        });
    },

    /**
     * Log booking events
     */
    booking: (event: string, bookingId: string, metadata?: Record<string, unknown>) => {
        logger.info('Booking Event', {
            type: 'booking',
            event,
            bookingId,
            ...metadata,
        });
    },

    /**
     * Log payment events
     */
    payment: (event: string, bookingId: string, amount?: number, metadata?: Record<string, unknown>) => {
        logger.info('Payment Event', {
            type: 'payment',
            event,
            bookingId,
            amount,
            ...metadata,
        });
    },

    /**
     * Log database operations
     */
    database: (operation: string, table: string, duration?: number, metadata?: Record<string, unknown>) => {
        logger.info('Database Operation', {
            type: 'database',
            operation,
            table,
            duration,
            ...metadata,
        });
    },

    /**
     * Log errors with context
     */
    error: (error: Error | unknown, context?: Record<string, unknown>) => {
        if (error instanceof Error) {
            logger.error('Error occurred', {
                type: 'error',
                message: error.message,
                stack: error.stack,
                ...context,
            });
        } else {
            logger.error('Error occurred', {
                type: 'error',
                error: String(error),
                ...context,
            });
        }
    },
};

export default logger;


