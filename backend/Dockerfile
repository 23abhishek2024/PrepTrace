# PrepTrace backend (Express monolith)
# node:22-slim (Debian) instead of alpine: onnxruntime-node, used for the local
# embedding model, needs glibc.
FROM node:22-slim

WORKDIR /app

# Install dependencies first so this layer is cached when only source code changes
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# The embedding model (~23 MB) is downloaded here on first use.
# docker-compose mounts a volume at this path so it is downloaded only once.
ENV MODEL_CACHE_DIR=/app/.model-cache

EXPOSE 8000
CMD ["node", "server.js"]
