# Product Requirements Document
## Discord Voice Event Reminder Bot

---

## 1. Objetivo del Producto

Desarrollar un bot de Discord que se conecte automáticamente a un canal de voz y emita recordatorios auditivos en horarios exactos para eventos críticos dentro de un videojuego.

El bot debe reducir la carga cognitiva del jugador y operar de forma confiable en sesiones largas.

---

## 2. Alcance

### Incluido
- Conexión automática a canales de voz.
- Reproducción de audios pregrabados.
- Recordatorios por voz (TTS) dinámicos.
- Programación precisa basada en tiempo real.
- Despliegue en VPS con EasyPanel.
- Operación 24/7.

### Excluido
- Comandos por texto complejos.
- Dashboards web.
- Interacción por mensajes privados.
- Soporte multi-servidor (fase inicial).

---

## 3. Usuarios Objetivo

- Jugadores de MMO / juegos con eventos temporales.
- Grupos que usan Discord como canal principal de coordinación.
- Usuarios técnicos que alojan bots en VPS propios.

---

## 4. Requerimientos Funcionales

### RF-01 Conexión de Voz
El bot debe:
- Conectarse automáticamente al canal configurado.
- Mantener conexión estable durante reproducción.
- Desconectarse tras finalizar el audio (configurable).

### RF-02 Reproducción de Audio
- Soporte para archivos `.opus`, `.wav`, `.mp3`.
- Priorizar audios preprocesados.
- Reproducción sin cortes ni distorsión.

### RF-03 Text-to-Speech
- Generar voz natural en español.
- Soportar mensajes dinámicos.
- Pre-generar audio antes del evento.

### RF-04 Programación de Eventos
- Usar cron para horarios exactos.
- Soportar múltiples eventos diarios.
- Permitir fácil modificación de horarios.

---

## 5. Requerimientos No Funcionales

### RNF-01 Rendimiento
- Consumo máximo de RAM: 300 MB.
- CPU optimizado (mínimo uso de FFmpeg en runtime).

### RNF-02 Estabilidad
- Recuperación automática tras crash.
- Manejo correcto de desconexiones de Discord.

### RNF-03 Seguridad
- Tokens solo por variables de entorno.
- Sin credenciales en repositorio.
- Sin puertos expuestos innecesarios.

---

## 6. Stack Tecnológico

- Runtime: Node.js
- Discord API: discord.js v14
- Voz: @discordjs/voice
- Audio: FFmpeg + Opus
- Scheduler: node-cron
- Contenedores: Docker + Nixpacks
- Orquestación: EasyPanel

---

## 7. Variables de Entorno

| Variable | Descripción |
|--------|------------|
| DISCORD_TOKEN | Token del bot |
| CHANNEL_ID | Canal de voz |
| AUDIO_DIR | Directorio de audios |
| TZ | Zona horaria |

---

## 8. Criterios de Éxito

- El bot reproduce el audio en el segundo correcto.
- No se cae tras varios días de ejecución.
- El audio es claro y entendible.
- El consumo de recursos se mantiene estable.
- El despliegue es reproducible.

---

## 9. Roadmap Futuro (No Implementar Aún)

- Soporte multi-servidor.
- Configuración por archivo YAML.
- Prioridad de eventos.
- Mensajes combinados (audio + texto).
