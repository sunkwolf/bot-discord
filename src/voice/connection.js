'use strict';

const {
    joinVoiceChannel,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection,
} = require('@discordjs/voice');
const { logger } = require('../utils/logger');
const { config } = require('../config');

/**
 * Manages voice channel connections for multiple channels/guilds
 */
class VoiceConnectionManager {
    constructor() {
        // Map of guildId -> connection info
        this.connections = new Map();
        this.reconnecting = new Set();
    }

    /**
     * Connect to a voice channel
     * @param {Object} channel - Discord voice channel object
     * @returns {Promise<import('@discordjs/voice').VoiceConnection>}
     */
    async connectToChannel(channel) {
        try {
            const guildId = channel.guild.id;

            // Check if already connected to this channel
            const existingConnection = getVoiceConnection(guildId);
            if (existingConnection && existingConnection.joinConfig.channelId === channel.id) {
                logger.debug('Already connected to voice channel', { channelId: channel.id });
                return existingConnection;
            }

            logger.info('Connecting to voice channel', {
                channelId: channel.id,
                channelName: channel.name,
                guildId: guildId,
            });

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: guildId,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false,
            });

            // Setup connection state handlers
            this._setupConnectionHandlers(connection, guildId, channel.id);

            // Wait for connection to be ready
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

            // Store connection info
            this.connections.set(guildId, {
                connection,
                channelId: channel.id,
            });

            logger.info('Voice connection established', { channelId: channel.id });

            return connection;
        } catch (error) {
            logger.error('Failed to connect to voice channel', {
                error: error.message,
                channelId: channel?.id,
            });
            throw error;
        }
    }

    /**
     * Setup handlers for connection state changes
     * @param {import('@discordjs/voice').VoiceConnection} connection
     * @param {string} guildId
     * @param {string} channelId
     * @private
     */
    _setupConnectionHandlers(connection, guildId, channelId) {
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            logger.warn('Voice connection disconnected', { guildId, channelId });

            if (this.reconnecting.has(guildId)) return;
            this.reconnecting.add(guildId);

            try {
                // Try to reconnect within 5 seconds
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                logger.info('Voice connection reconnecting...', { guildId });
            } catch {
                // Connection is truly disconnected
                logger.warn('Voice connection lost, cleaning up', { guildId });
                this._cleanupConnection(guildId);
            } finally {
                this.reconnecting.delete(guildId);
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            logger.info('Voice connection destroyed', { guildId, channelId });
            this.connections.delete(guildId);
        });

        connection.on('error', (error) => {
            logger.error('Voice connection error', { guildId, error: error.message });
        });
    }

    /**
     * Disconnect from a specific guild's voice channel
     * @param {string} guildId - Guild ID to disconnect from
     */
    disconnectFromChannel(guildId) {
        const connection = getVoiceConnection(guildId);
        if (connection) {
            logger.info('Disconnecting from voice channel', { guildId });

            // Delay disconnect to allow audio to finish
            setTimeout(() => {
                const conn = getVoiceConnection(guildId);
                if (conn) {
                    conn.destroy();
                }
                this.connections.delete(guildId);
            }, config.voice.disconnectDelay * 1000);
        }
    }

    /**
     * Clean up a specific connection
     * @param {string} guildId
     * @private
     */
    _cleanupConnection(guildId) {
        const connection = getVoiceConnection(guildId);
        if (connection) {
            connection.destroy();
        }
        this.connections.delete(guildId);
    }

    /**
     * Disconnect from all voice channels
     */
    disconnectAll() {
        for (const [guildId] of this.connections) {
            this._cleanupConnection(guildId);
        }
        this.connections.clear();
        logger.info('Disconnected from all voice channels');
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use connectToChannel instead
     */
    async connect(channel) {
        return this.connectToChannel(channel);
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use disconnectFromChannel instead
     */
    disconnect() {
        this.disconnectAll();
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use disconnectFromChannel instead
     */
    disconnectAfterDelay() {
        // This is now handled per-channel in disconnectFromChannel
    }

    /**
     * Clean up all resources
     */
    cleanup() {
        this.disconnectAll();
    }

    /**
     * Check if connected to a specific guild
     * @param {string} guildId
     * @returns {boolean}
     */
    isConnected(guildId) {
        const connection = getVoiceConnection(guildId);
        return connection?.state?.status === VoiceConnectionStatus.Ready;
    }

    /**
     * Get connection for a specific guild
     * @param {string} guildId
     * @returns {import('@discordjs/voice').VoiceConnection|null}
     */
    getConnection(guildId) {
        return getVoiceConnection(guildId);
    }
}

// Singleton instance
const voiceManager = new VoiceConnectionManager();

module.exports = { voiceManager, VoiceConnectionManager };
