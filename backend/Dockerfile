# Multi-stage Dockerfile for CodeEcho Backend
# This Dockerfile includes Node.js backend + Python RAG services

FROM node:18-alpine AS backend-build

# Install Python and build dependencies
RUN apk add --no-cache \
  python3 \
  py3-pip \
  git \
  make \
  g++ \
  portaudio-dev \
  && ln -sf python3 /usr/bin/python

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --production --no-package-lock

# Copy source code
COPY . .

# Install Python requirements
RUN pip3 install --no-cache-dir --break-system-packages -r rag/requirements.txt

# Create sandbox directory
RUN mkdir -p /app/sandbox /app/chat_gpt

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {let body = ''; r.on('data', (chunk) => body += chunk); r.on('end', () => {if (r.statusCode === 200) process.exit(0); else process.exit(1);})})" || exit 1

# Start backend server
CMD ["node", "index.js"]
