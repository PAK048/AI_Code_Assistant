# Multi-stage Dockerfile for CodeEcho Backend (Railway deployment)
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

# Copy backend package files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --production

# Copy backend source
COPY backend/ ./

# Back to root
WORKDIR /app

# Copy Python requirements
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copy RAG scripts
COPY rag/ ./rag/

# Copy orchestrate config
COPY orchestrate/ ./orchestrate/

# Copy Python agents (main.py, graph.py)
COPY main.py graph.py ./

# Copy runner files (for reference, not executed in this container)
COPY runner/ ./runner/

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
WORKDIR /app/backend
CMD ["node", "index.js"]
