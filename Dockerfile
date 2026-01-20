# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    g++ \
    make \
    libtool \
    autoconf \
    automake \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

# Production stage
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies (FFmpeg)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Create directories for audio and cache
RUN mkdir -p /app/audio /app/cache

# Set default environment variables
ENV NODE_ENV=production
ENV TZ=America/Mexico_City
ENV AUDIO_DIR=/app/audio

CMD ["npm", "start"]
