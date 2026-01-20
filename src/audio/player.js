'use strict';

const {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
} = require('@discordjs/voice');
const { createReadStream, existsSync } = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * Manages audio playback for voice connections
 */
class AudioPlayerManager {
    constructor() {
        this.player = null;
        this.currentResource = null;
    }

    /**
     * Create or get the audio player
     * @returns {import('@discordjs/voice').AudioPlayer}
     */
    getPlayer() {
        if (!this.player) {
            this.player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play,
                },
            });

            this._setupPlayerHandlers();
        }
        return this.player;
    }

    /**
     * Setup event handlers for the audio player
     * @private
     */
    _setupPlayerHandlers() {
        this.player.on(AudioPlayerStatus.Playing, () => {
            logger.debug('Audio player started playing');
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
            logger.debug('Audio player finished playing');
            this._cleanup();
        });

        this.player.on('error', (error) => {
            logger.error('Audio player error', {
                error: error.message,
                resource: error.resource?.metadata?.title,
            });
            this._cleanup();
        });
    }

    /**
     * Play an audio file
     * @param {string} filePath - Path to the audio file
     * @param {import('@discordjs/voice').VoiceConnection} connection - Voice connection
     * @returns {Promise<void>}
     */
    async playFile(filePath, connection) {
        const absolutePath = path.resolve(filePath);

        // Validate file exists
        if (!existsSync(absolutePath)) {
            throw new Error(`Audio file not found: ${absolutePath}`);
        }

        const ext = path.extname(absolutePath).toLowerCase();
        logger.info('Playing audio file', { file: path.basename(absolutePath), ext });

        try {
            const player = this.getPlayer();

            // Create audio resource based on file type
            let resource;

            if (ext === '.opus') {
                // Direct Opus files - most efficient
                resource = createAudioResource(createReadStream(absolutePath), {
                    inputType: 2, // StreamType.OggOpus
                    metadata: { title: path.basename(absolutePath) },
                });
            } else {
                // Other formats (.mp3, .wav) - FFmpeg will be used automatically
                resource = createAudioResource(absolutePath, {
                    metadata: { title: path.basename(absolutePath) },
                });
            }

            this.currentResource = resource;

            // Subscribe connection to player
            connection.subscribe(player);

            // Play the audio
            player.play(resource);

            // Wait for playback to complete
            return new Promise((resolve, reject) => {
                const onIdle = () => {
                    cleanup();
                    resolve();
                };

                const onError = (error) => {
                    cleanup();
                    reject(error);
                };

                const cleanup = () => {
                    player.off(AudioPlayerStatus.Idle, onIdle);
                    player.off('error', onError);
                };

                player.once(AudioPlayerStatus.Idle, onIdle);
                player.once('error', onError);
            });
        } catch (error) {
            logger.error('Failed to play audio file', {
                file: filePath,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Stop current playback
     */
    stop() {
        if (this.player) {
            this.player.stop(true);
        }
    }

    /**
     * Clean up resources
     * @private
     */
    _cleanup() {
        this.currentResource = null;
    }

    /**
     * Destroy the player completely
     */
    destroy() {
        if (this.player) {
            this.player.stop(true);
            this.player = null;
        }
        this.currentResource = null;
    }
}

// Singleton instance
const audioPlayer = new AudioPlayerManager();

module.exports = { audioPlayer, AudioPlayerManager };
