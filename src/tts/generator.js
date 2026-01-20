'use strict';

const { existsSync, mkdirSync, writeFileSync } = require('fs');
const path = require('path');
const crypto = require('crypto');
const { config } = require('../config');
const { logger } = require('../utils/logger');

/**
 * Dynamically import the ESM module
 */
let EdgeTTS = null;

async function loadEdgeTTS() {
    if (!EdgeTTS) {
        const module = await import('edge-tts-universal');
        EdgeTTS = module.EdgeTTS;
    }
    return EdgeTTS;
}

/**
 * TTS Generator using Edge-TTS-Universal
 */
class TTSGenerator {
    constructor() {
        this.cacheDir = config.cacheDir;
        this._ensureCacheDir();
    }

    /**
     * Ensure cache directory exists
     * @private
     */
    _ensureCacheDir() {
        if (!existsSync(this.cacheDir)) {
            mkdirSync(this.cacheDir, { recursive: true });
            logger.debug('Created TTS cache directory', { path: this.cacheDir });
        }
    }

    /**
     * Generate a cache key for the given text and voice
     * @param {string} text - Text to generate
     * @param {string} voice - Voice name
     * @returns {string} Cache filename
     * @private
     */
    _getCacheKey(text, voice) {
        const hash = crypto
            .createHash('md5')
            .update(`${text}|${voice}|${config.tts.rate}|${config.tts.pitch}`)
            .digest('hex');
        return `tts_${hash}.mp3`;
    }

    /**
     * Get cached file path if exists
     * @param {string} text - Text to check
     * @param {string} [voice] - Voice name
     * @returns {string|null} Cached file path or null
     */
    getCached(text, voice = config.tts.voice) {
        const cacheFile = path.join(this.cacheDir, this._getCacheKey(text, voice));
        if (existsSync(cacheFile)) {
            return cacheFile;
        }
        return null;
    }

    /**
     * Generate TTS audio from text
     * @param {string} text - Text to convert to speech
     * @param {Object} [options] - TTS options
     * @param {string} [options.voice] - Voice name
     * @param {string} [options.rate] - Speech rate
     * @param {string} [options.pitch] - Voice pitch
     * @param {boolean} [options.useCache=true] - Whether to use/save cache
     * @returns {Promise<string>} Path to generated audio file
     */
    async generate(text, options = {}) {
        const voice = options.voice || config.tts.voice;
        const rate = options.rate || config.tts.rate;
        const pitch = options.pitch || config.tts.pitch;
        const useCache = options.useCache !== false;

        // Check cache first
        if (useCache) {
            const cached = this.getCached(text, voice);
            if (cached) {
                logger.debug('Using cached TTS audio', { text: text.substring(0, 50) });
                return cached;
            }
        }

        const cacheFile = path.join(this.cacheDir, this._getCacheKey(text, voice));

        logger.info('Generating TTS audio', {
            text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            voice,
        });

        try {
            // Load EdgeTTS dynamically (ESM module)
            const EdgeTTSClass = await loadEdgeTTS();

            // Create EdgeTTS instance
            const tts = new EdgeTTSClass({
                text,
                voice,
                rate,
                pitch,
            });

            // Generate audio
            const result = await tts.synthesize();

            // Write audio to file
            writeFileSync(cacheFile, Buffer.from(result.audio));

            logger.debug('TTS generation complete', { file: cacheFile });
            return cacheFile;
        } catch (error) {
            logger.error('TTS generation failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Pre-generate TTS for multiple texts
     * @param {string[]} texts - Array of texts to pre-generate
     * @returns {Promise<string[]>} Array of file paths
     */
    async pregenerate(texts) {
        const results = [];
        for (const text of texts) {
            try {
                const file = await this.generate(text);
                results.push(file);
            } catch (error) {
                logger.error('Failed to pregenerate TTS', { text, error: error.message });
            }
        }
        return results;
    }

    /**
     * Clear the TTS cache
     */
    clearCache() {
        const fs = require('fs');
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
            if (file.startsWith('tts_') && file.endsWith('.mp3')) {
                fs.unlinkSync(path.join(this.cacheDir, file));
            }
        }
        logger.info('TTS cache cleared');
    }
}

// Singleton instance
const ttsGenerator = new TTSGenerator();

module.exports = { ttsGenerator, TTSGenerator };
