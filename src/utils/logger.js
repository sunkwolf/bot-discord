'use strict';

const { config } = require('../config');

/**
 * Log levels with numeric priority
 */
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Current log level from config
 */
const currentLevel = LOG_LEVELS[config.logLevel] ?? LOG_LEVELS.info;

/**
 * Format timestamp for log output
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message  
 * @param {Object} [data] - Additional data
 * @returns {string} Formatted log line
 */
function formatLog(level, message, data) {
    const timestamp = getTimestamp();
    const levelUpper = level.toUpperCase().padEnd(5);
    let line = `[${timestamp}] ${levelUpper} ${message}`;

    if (data && Object.keys(data).length > 0) {
        line += ` ${JSON.stringify(data)}`;
    }

    return line;
}

/**
 * Log a message if level is enabled
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data
 */
function log(level, message, data) {
    if (LOG_LEVELS[level] >= currentLevel) {
        const line = formatLog(level, message, data);

        if (level === 'error') {
            console.error(line);
        } else if (level === 'warn') {
            console.warn(line);
        } else {
            console.log(line);
        }
    }
}

/**
 * Logger interface
 */
const logger = {
    debug: (message, data) => log('debug', message, data),
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
};

module.exports = { logger };
