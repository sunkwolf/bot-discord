'use strict';

const cron = require('node-cron');
const { logger } = require('../utils/logger');
const { config } = require('../config');
const { voiceManager } = require('../voice/connection');
const { audioPlayer } = require('../audio/player');
const { ttsGenerator } = require('../tts/generator');
const { events, EventType, getEnabledEvents, getRotatedAudio } = require('./events');

/**
 * Event Scheduler using node-cron
 */
class EventScheduler {
    constructor(client) {
        this.client = client;
        this.scheduledJobs = new Map();
        this.pregeneratedAudio = new Map();
    }

    /**
     * Check if currently in weekly maintenance window
     * Maintenance: Tuesday 13:30 - 19:30 (Mexico City time)
     * @returns {boolean} True if in maintenance window
     * @private
     */
    _isMaintenanceWindow() {
        const now = new Date();
        // Convert to Mexico City timezone
        const mexicoTime = new Date(now.toLocaleString('en-US', { timeZone: config.timezone }));
        
        const dayOfWeek = mexicoTime.getDay(); // 0=Sunday, 1=Monday, 2=Tuesday
        const hours = mexicoTime.getHours();
        const minutes = mexicoTime.getMinutes();
        const currentTimeInMinutes = hours * 60 + minutes;
        
        // Tuesday = 2, 13:30 = 810 minutes, 19:30 = 1170 minutes
        const isTuesday = dayOfWeek === 2;
        const startTime = 13 * 60 + 30; // 13:30 = 810 minutes
        const endTime = 19 * 60 + 30;   // 19:30 = 1170 minutes
        
        const inWindow = isTuesday && currentTimeInMinutes >= startTime && currentTimeInMinutes < endTime;
        
        if (inWindow) {
            logger.debug('Currently in maintenance window', {
                day: dayOfWeek,
                time: `${hours}:${minutes}`,
            });
        }
        
        return inWindow;
    }

    /**
     * Initialize the scheduler with all enabled events
     */
    async initialize() {
        const enabledEvents = getEnabledEvents();

        if (enabledEvents.length === 0) {
            logger.warn('No events enabled. Add events to src/scheduler/events.js');
            return;
        }

        logger.info('Initializing scheduler', {
            eventCount: enabledEvents.length,
            channelCount: config.channelIds.length,
        });

        // Pre-generate TTS for all TTS events
        await this._pregenerateTTS(enabledEvents);

        // Schedule all enabled events
        for (const event of enabledEvents) {
            this.scheduleEvent(event);
        }
    }

    /**
     * Pre-generate TTS audio for upcoming events
     * @param {Array} eventsList - List of events
     * @private
     */
    async _pregenerateTTS(eventsList) {
        const ttsEvents = eventsList.filter(e => e.type === EventType.TTS);

        if (ttsEvents.length === 0) return;

        logger.info('Pre-generating TTS audio', { count: ttsEvents.length });

        for (const event of ttsEvents) {
            try {
                const audioPath = await ttsGenerator.generate(event.content);
                this.pregeneratedAudio.set(event.name, audioPath);
                logger.debug('Pre-generated TTS for event', { name: event.name });
            } catch (error) {
                logger.error('Failed to pre-generate TTS', {
                    event: event.name,
                    error: error.message,
                });
            }
        }
    }

    /**
     * Schedule a single event
     * @param {Object} event - Event configuration
     */
    scheduleEvent(event) {
        if (!cron.validate(event.cron)) {
            logger.error('Invalid cron expression', {
                event: event.name,
                cron: event.cron,
            });
            return;
        }

        // Schedule the main event
        const job = cron.schedule(event.cron, async () => {
            await this._executeEventForAllChannels(event);
        }, {
            timezone: config.timezone,
        });

        this.scheduledJobs.set(event.name, job);

        logger.info('Event scheduled', {
            name: event.name,
            cron: event.cron,
            type: event.type,
        });
    }

    /**
     * Execute an event for all configured channels
     * @param {Object} event - Event to execute
     * @private
     */
    async _executeEventForAllChannels(event) {
        logger.info('Executing scheduled event for all channels', {
            name: event.name,
            channelCount: config.channelIds.length,
        });

        // Execute in parallel for all channels
        const promises = config.channelIds.map(channelId =>
            this._executeEventForChannel(event, channelId)
        );

        await Promise.allSettled(promises);
    }

    /**
     * Check if there are users in a specific voice channel (excluding bots)
     * @param {string} channelId - Channel ID to check
     * @returns {Promise<boolean>} True if users are present
     * @private
     */
    async _hasUsersInChannel(channelId) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || !channel.isVoiceBased()) {
                return false;
            }

            // Count members excluding bots
            const humanMembers = channel.members.filter(member => !member.user.bot);
            const count = humanMembers.size;

            logger.debug('Channel user check', {
                channelId,
                userCount: count,
            });

            return count > 0;
        } catch (error) {
            logger.error('Failed to check channel users', { channelId, error: error.message });
            return false;
        }
    }

    /**
     * Execute an event for a specific channel
     * @param {Object} event - Event to execute
     * @param {string} channelId - Channel ID to execute in
     * @private
     */
    async _executeEventForChannel(event, channelId) {
        // Skip events during maintenance window (Tuesday 13:30-19:30)
        if (this._isMaintenanceWindow()) {
            logger.info('Skipping event - maintenance window active', {
                name: event.name,
                channelId,
            });
            return;
        }

        // Check if users are required and channel is empty
        const requireUsers = event.requireUsers !== false; // Default to true
        if (requireUsers) {
            const hasUsers = await this._hasUsersInChannel(channelId);
            if (!hasUsers) {
                logger.info('Skipping event - no users in channel', {
                    name: event.name,
                    channelId,
                });
                return;
            }
        }

        logger.info('Executing event for channel', { name: event.name, channelId });

        let connection = null;
        let guildId = null;

        try {
            // Get the voice channel
            const channel = await this._getVoiceChannel(channelId);
            if (!channel) {
                logger.error('Voice channel not found', { channelId });
                return;
            }

            guildId = channel.guild.id;

            // Connect to voice channel
            connection = await voiceManager.connectToChannel(channel);
            if (!connection) {
                logger.error('Failed to connect to voice channel', { channelId });
                return;
            }

            // Small delay to ensure connection is stable
            await this._delay(500);

            // Get the audio file to play
            let audioPath;

            if (event.type === EventType.TTS) {
                // Use pre-generated TTS or generate on-the-fly
                audioPath = this.pregeneratedAudio.get(event.name);
                if (!audioPath) {
                    audioPath = await ttsGenerator.generate(event.content);
                }
            } else if (event.type === EventType.AUDIO_ROTATE) {
                // Get rotated audio based on current hour
                audioPath = getRotatedAudio(event.content);
                logger.debug('Using rotated audio', {
                    set: event.content,
                    file: audioPath,
                });
            } else {
                // Direct audio file
                audioPath = event.content;
            }

            // Play the audio
            await audioPlayer.playFile(audioPath, connection);

            logger.info('Event playback complete', { name: event.name, channelId });

        } catch (error) {
            logger.error('Event execution failed', {
                event: event.name,
                channelId,
                error: error.message,
            });
        } finally {
            // Always disconnect after event (success or failure)
            if (connection && guildId) {
                voiceManager.disconnectFromChannel(guildId);
            }
        }
    }

    /**
     * Get a voice channel by ID
     * @param {string} channelId - Channel ID
     * @returns {Promise<Object|null>} Voice channel object
     * @private
     */
    async _getVoiceChannel(channelId) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || !channel.isVoiceBased()) {
                return null;
            }
            return channel;
        } catch (error) {
            logger.error('Failed to fetch voice channel', { channelId, error: error.message });
            return null;
        }
    }

    /**
     * Delay execution
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Stop all scheduled jobs
     */
    stopAll() {
        for (const [name, job] of this.scheduledJobs) {
            job.stop();
            logger.debug('Stopped scheduled job', { name });
        }
        this.scheduledJobs.clear();
    }

    /**
     * Manually trigger an event by name (for testing)
     * @param {string} eventName - Name of the event to trigger
     */
    async triggerEvent(eventName) {
        const event = events.find(e => e.name === eventName);
        if (!event) {
            logger.error('Event not found', { name: eventName });
            return;
        }
        await this._executeEventForAllChannels(event);
    }
}

module.exports = { EventScheduler };
