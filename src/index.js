'use strict';

// Load environment variables
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const { config, validateConfig } = require('./config');
const { logger } = require('./utils/logger');
const { EventScheduler } = require('./scheduler/cron');
const { voiceManager } = require('./voice/connection');
const { audioPlayer } = require('./audio/player');

/**
 * Initialize the Discord client
 */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

/**
 * Scheduler instance
 */
let scheduler = null;

/**
 * Handle bot ready event
 */
client.once('ready', async () => {
    logger.info('Bot is online', {
        username: client.user.tag,
        guilds: client.guilds.cache.size,
    });

    // Initialize the scheduler
    scheduler = new EventScheduler(client);
    await scheduler.initialize();

    logger.info('Bot initialization complete');
});

/**
 * Handle unexpected errors
 */
client.on('error', (error) => {
    logger.error('Discord client error', { error: error.message });
});

/**
 * Handle warnings
 */
client.on('warn', (warning) => {
    logger.warn('Discord client warning', { warning });
});

/**
 * Graceful shutdown handler
 */
async function shutdown(signal) {
    logger.info('Shutdown signal received', { signal });

    // Stop scheduler
    if (scheduler) {
        scheduler.stopAll();
    }

    // Disconnect from voice
    voiceManager.cleanup();

    // Cleanup audio player
    audioPlayer.destroy();

    // Destroy Discord client
    client.destroy();

    logger.info('Graceful shutdown complete');
    process.exit(0);
}

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', {
        reason: reason?.message || reason,
    });
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    // Give time to log before exit
    setTimeout(() => process.exit(1), 1000);
});

/**
 * Handle shutdown signals
 */
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

/**
 * Main entry point
 */
async function main() {
    try {
        // Validate configuration
        validateConfig();

        logger.info('Starting Discord Voice Reminder Bot');
        logger.info('Configuration loaded', {
            channelId: config.channelId,
            timezone: config.timezone,
            audioDir: config.audioDir,
        });

        // Login to Discord
        await client.login(config.token);

    } catch (error) {
        logger.error('Failed to start bot', { error: error.message });
        process.exit(1);
    }
}

// Start the bot
main();
