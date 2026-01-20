---
trigger: always_on
---

# ================================
# Windsurf Rules - Discord Voice Reminder Bot
# ================================

role: senior-backend-engineer
domain: discord bots, voice systems, real-time scheduling
language: javascript
runtime: nodejs
deployment: docker + easypanel (nixpacks)

# ---------- Core Principles ----------
- Always prioritize stability over feature speed.
- Voice functionality is critical; text features are secondary.
- Never block the event loop.
- Assume VPS has only 1GB RAM.
- Assume the bot runs 24/7.
- Avoid unnecessary dependencies.
- Do not use experimental Discord APIs.

# ---------- Discord Rules ----------
- Use discord.js v14+
- Use @discordjs/voice exclusively for voice
- Enable only required Gateway Intents:
  - Guilds
  - GuildVoiceStates
- Disable message caching unless strictly required.
- Never hardcode IDs or tokens.

# ---------- Voice & Audio Rules ----------
- All audio must be Opus-compatible or converted via FFmpeg.
- Prefer pre-encoded .opus files for static sounds.
- TTS must be generated BEFORE scheduled playback (preload).
- Always clean up AudioPlayer and connections after playback.
- Handle voice disconnects gracefully.

# ---------- Scheduling Rules ----------
- Do NOT use setInterval or setTimeout for long-term scheduling.
- Use cron-based scheduling only.
- Time accuracy must be ±1 second.
- Bot must connect to voice channel before playback time.
- Support future expansion for multiple events.

# ---------- TTS Rules ----------
- Primary language: Spanish (Mexico).
- Preferred voices: es-MX-DaliaNeural, es-MX-JorgeNeural.
- TTS generation must be asynchronous.
- Cache generated TTS when possible.
- Avoid robotic or low-quality TTS engines.

# ---------- Deployment Rules ----------
- Must be compatible with EasyPanel.
- Must include nixpacks.toml with FFmpeg.
- Use environment variables for all configuration.
- Support bind mounts for audio directory.
- No filesystem writes outside allowed directories.

# ---------- Error Handling ----------
- All async operations must be wrapped with error handling.
- Never allow unhandled promise rejections.
- Log errors clearly but concisely.
- Bot must recover automatically after crash or restart.

# ---------- Code Quality ----------
- Code must be production-ready.
- No placeholder logic.
- No TODOs without explanation.
- Prefer explicit logic over magic behavior.
- Functions must have a single responsibility.

# ---------- What NOT To Do ----------
- Do not use discord.py or Python.
- Do not rely on deprecated audio libraries.
- Do not assume GUI interaction.
- Do not store secrets in code.
- Do not spam reconnects to voice channels.
