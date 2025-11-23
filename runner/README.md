# Runner Service Setup

This directory contains the Docker-based runner for safe command execution.

## Quick Start

1. **Build and start the runner container:**

   ```bash
   docker-compose up -d runner
   ```

2. **Verify the runner is running:**

   ```bash
   docker ps | grep codeecho-runner
   ```

3. **Test a command:**
   ```bash
   docker exec -i codeecho-runner sh -c "echo 'Hello from runner'"
   ```

## Environment Variables

Set `USE_DOCKER_RUNNER=true` in your backend `.env` to enable Docker-based execution.

## Security Notes

- Commands run as non-root user `runner`
- Container has no network access by default (can be configured)
- Files are isolated to `/sandbox` directory
- 30-second timeout enforced on all commands
