# Discord Voice Event Reminder Bot

Bot de Discord que se conecta automáticamente a un canal de voz y emite recordatorios auditivos en horarios exactos.

## Características

- ✅ Conexión automática a canales de voz
- ✅ Reproducción de archivos de audio (.opus, .mp3, .wav)
- ✅ Text-to-Speech (TTS) con voces naturales en español
- ✅ Programación precisa con cron
- ✅ Pre-generación de audio TTS
- ✅ Recuperación automática de desconexiones
- ✅ Docker + EasyPanel ready

## Requisitos

- Node.js 18+
- FFmpeg instalado en el sistema
- Python 3 (para edge-tts)

## Instalación

### Local

```bash
# Clonar e instalar dependencias
npm install

# Instalar edge-tts globalmente
pip install edge-tts

# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tu token y channel ID

# Ejecutar
npm start
```

### Docker

```bash
docker build -t discord-voice-bot .
docker run -d \
  -e DISCORD_TOKEN=your_token \
  -e CHANNEL_ID=your_channel_id \
  -v ./audio:/app/audio \
  discord-voice-bot
```

### EasyPanel

El proyecto incluye `nixpacks.toml` para despliegue automático.

1. Conectar repositorio a EasyPanel
2. Configurar variables de entorno
3. Montar volumen para `/app/audio` (opcional)
4. Deploy

## Configuración

### Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `DISCORD_TOKEN` | Token del bot de Discord | ✅ |
| `CHANNEL_ID` | ID del canal de voz | ✅ |
| `AUDIO_DIR` | Directorio de audios | No |
| `CACHE_DIR` | Directorio de caché TTS | No |
| `TZ` | Zona horaria | No |
| `TTS_VOICE` | Voz TTS (default: es-MX-DaliaNeural) | No |
| `LOG_LEVEL` | Nivel de log: debug, info, warn, error | No |

### Agregar Eventos

Edita `src/scheduler/events.js`:

```javascript
{
  name: 'Boss Spawn',
  cron: '0 55 19 * * *', // 7:55 PM diario
  type: EventType.TTS,
  content: 'Atención, el jefe aparecerá en 5 minutos.',
  enabled: true,
},
```

#### Formato Cron

```
┌────────────── segundo (0 - 59)
│ ┌──────────── minuto (0 - 59)
│ │ ┌────────── hora (0 - 23)
│ │ │ ┌──────── día del mes (1 - 31)
│ │ │ │ ┌────── mes (1 - 12)
│ │ │ │ │ ┌──── día de la semana (0 - 7)
│ │ │ │ │ │
* * * * * *
```

#### Voces TTS Disponibles

- `es-MX-DaliaNeural` - Voz femenina México (default)
- `es-MX-JorgeNeural` - Voz masculina México
- `es-ES-ElviraNeural` - Voz femenina España
- `es-ES-AlvaroNeural` - Voz masculino España

## Estructura del Proyecto

```
bot-discord/
├── src/
│   ├── index.js          # Punto de entrada
│   ├── config.js         # Configuración
│   ├── audio/
│   │   └── player.js     # Reproductor de audio
│   ├── voice/
│   │   └── connection.js # Gestor de conexión de voz
│   ├── tts/
│   │   └── generator.js  # Generador TTS
│   ├── scheduler/
│   │   ├── cron.js       # Programador cron
│   │   └── events.js     # Definición de eventos
│   └── utils/
│       └── logger.js     # Logger
├── audio/                 # Archivos de audio pre-grabados
├── cache/                 # Caché de TTS generado
├── package.json
├── Dockerfile
├── nixpacks.toml
└── .env.example
```

## Solución de Problemas

### El bot no reproduce audio
- Verifica que FFmpeg esté instalado: `ffmpeg -version`
- Verifica que el bot tenga permisos en el canal de voz

### Error de TTS
- Verifica que edge-tts esté instalado: `edge-tts --version`
- Prueba generar audio manualmente: `edge-tts --text "Hola" --write-media test.mp3`

### Conexión inestable
- Verifica la latencia de red hacia Discord
- Revisa los logs para errores de autenticación

## Licencia

MIT
