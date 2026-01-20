'use strict';

const path = require('path');
const { config } = require('../config');

/**
 * Event types
 */
const EventType = {
    AUDIO: 'audio',           // Play a pre-recorded audio file
    AUDIO_ROTATE: 'audio_rotate', // Rotate between multiple audio files
    TTS: 'tts',               // Generate and play TTS
};

/**
 * Audio sets for rotation (3 different voice variants)
 * The scheduler will rotate through these based on the current hour
 */
const audioSets = {
    // Shugo 15 min warning (plays at :15)
    shugo15: [
        path.join(config.audioDir, 'shugo.mp3'),
        path.join(config.audioDir, 'shugo_1.mp3'),
        path.join(config.audioDir, 'shugo_2.mp3'),
    ],
    // Shugo 10 min warning (plays at :10)
    shugo10: [
        path.join(config.audioDir, 'shugo5.mp3'),
        path.join(config.audioDir, 'shugo5_1.mp3'),
        path.join(config.audioDir, 'shugo5_2.mp3'),
    ],
};

/**
 * Get audio file for a set based on current hour rotation
 * @param {string} setName - Name of the audio set
 * @returns {string} Path to audio file
 */
function getRotatedAudio(setName) {
    const set = audioSets[setName];
    if (!set || set.length === 0) {
        throw new Error(`Audio set not found: ${setName}`);
    }

    const hour = new Date().getHours();
    const index = hour % set.length; // Rotate based on current hour
    return set[index];
}

/**
 * Event definitions
 * 
 * Each event has:
 * - name: Human readable name for logging
 * - cron: Cron expression (second minute hour dayOfMonth month dayOfWeek)
 * - type: 'audio', 'audio_rotate', or 'tts'
 * - content: File path, audio set name, or text message
 * - enabled: Whether the event is active
 * - requireUsers: Whether to skip if no users in channel (default: true)
 * 
 * Cron format: second(0-59) minute(0-59) hour(0-23) day(1-31) month(1-12) weekday(0-7)
 */
const events = [
    // =====================================================
    // SHUGO EVENTS - With voice rotation
    // =====================================================

    // Every hour at minute 15 (rotates between 3 voices)
    {
        name: 'Shugo 15 min',
        cron: '0 15 * * * *',
        type: EventType.AUDIO_ROTATE,
        content: 'shugo15',
        enabled: true,
        requireUsers: true,
    },

    // Every hour at minute 10 (rotates between 3 voices)
    {
        name: 'Shugo 10 min',
        cron: '0 10 * * * *',
        type: EventType.AUDIO_ROTATE,
        content: 'shugo10',
        enabled: true,
        requireUsers: true,
    },

    // =====================================================
    // RESET & EXTRA EVENTS
    // =====================================================

    // Every hour at minute 42
    {
        name: 'Culito 3',
        cron: '0 42 * * * *',
        type: EventType.AUDIO,
        content: path.join(config.audioDir, 'culito3.mp3'),
        enabled: true,
        requireUsers: true,
    },

    // Every hour at minute 45
    {
        name: 'Culito',
        cron: '0 45 * * * *',
        type: EventType.AUDIO,
        content: path.join(config.audioDir, 'culito.mp3'),
        enabled: true,
        requireUsers: true,
    },

    // Daily reset at 15:00 (3 PM)
    {
        name: 'Reset Diario',
        cron: '0 0 15 * * *',
        type: EventType.AUDIO,
        content: path.join(config.audioDir, 'reset_diario.mp3'),
        enabled: true,
        requireUsers: true,
    },

    // Weekly maintenance: Tuesday at 11:00 AM
    {
        name: 'Mantenimiento',
        cron: '0 0 11 * * 2', // 2 = Tuesday
        type: EventType.AUDIO,
        content: path.join(config.audioDir, 'mantenimiento.mp3'),
        enabled: true,
        requireUsers: true,
    },

    // =====================================================
    // RIFT EVENTS (Every 3 hours)
    // Hours: 00, 03, 06, 09, 12, 15, 18, 21
    // =====================================================

    // Rift 5 mon warning (55 minutes past the previous hour)
    {
        name: 'Rift 5 min',
        cron: '0 55 23,2,5,8,11,14,17,20 * * *',
        type: EventType.AUDIO,
        content: path.join(config.audioDir, 'rift_5.mp3'),
        enabled: true,
        requireUsers: true,
    },

    // Rift spawn (Top of the hour)
    {
        name: 'Rift Spawn',
        cron: '0 0 0,3,6,9,12,15,18,21 * * *',
        type: EventType.AUDIO,
        content: path.join(config.audioDir, 'rift.mp3'),
        enabled: true,
        requireUsers: true,
    },
];

/**
 * Get all enabled events
 * @returns {Array} Enabled events
 */
function getEnabledEvents() {
    return events.filter(event => event.enabled);
}

/**
 * Get event by name
 * @param {string} name - Event name
 * @returns {Object|undefined} Event object
 */
function getEventByName(name) {
    return events.find(event => event.name === name);
}

module.exports = {
    events,
    EventType,
    audioSets,
    getEnabledEvents,
    getEventByName,
    getRotatedAudio,
};
