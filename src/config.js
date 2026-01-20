'use strict';

require('dotenv/config');

/**
 * Parse channel IDs from environment variable
 * @param {string} value - Comma-separated channel IDs
 * @returns {string[]} Array of channel IDs
 */
function parseChannelIds(value) {
  if (!value) return [];
  return value.split(',').map(id => id.trim()).filter(id => id.length > 0);
}

/**
 * Configuration loaded from environment variables
 */
const config = {
  // Discord Bot Token (required)
  token: process.env.DISCORD_TOKEN,

  // Voice Channel IDs (required) - supports multiple channels
  channelIds: parseChannelIds(process.env.CHANNEL_IDS || process.env.CHANNEL_ID),

  // Audio directory for pre-recorded files
  audioDir: process.env.AUDIO_DIR || './audio',

  // Cache directory for TTS generated files
  cacheDir: process.env.CACHE_DIR || './cache',

  // Timezone
  timezone: process.env.TZ || 'America/Mexico_City',

  // Log level
  logLevel: process.env.LOG_LEVEL || 'info',

  // Voice settings
  voice: {
    // Seconds to wait before disconnecting after playback
    disconnectDelay: parseInt(process.env.DISCONNECT_DELAY, 10) || 5,
    // Seconds to connect before scheduled event
    preConnectSeconds: parseInt(process.env.PRE_CONNECT_SECONDS, 10) || 5,
  },

  // TTS settings
  tts: {
    // Primary voice for TTS
    voice: process.env.TTS_VOICE || 'es-MX-DaliaNeural',
    // Rate adjustment (-50% to +50%)
    rate: process.env.TTS_RATE || '+0%',
    // Pitch adjustment
    pitch: process.env.TTS_PITCH || '+0Hz',
  },
};

/**
 * Validate required configuration
 */
function validateConfig() {
  const missing = [];

  if (!config.token) {
    missing.push('DISCORD_TOKEN');
  }

  if (config.channelIds.length === 0) {
    missing.push('CHANNEL_IDS');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}

module.exports = {
  config,
  validateConfig,
};
