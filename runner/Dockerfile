# Use a lightweight Node.js image that includes git and basic tools
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache git python3 py3-pip make g++

# Create a non-root user for safety
RUN addgroup -S runner && adduser -S runner -G runner

# Set working directory
WORKDIR /sandbox

# Switch to non-root user
USER runner

# Default command keeps container alive but idle
CMD ["tail", "-f", "/dev/null"]
