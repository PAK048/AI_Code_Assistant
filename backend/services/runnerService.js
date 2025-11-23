const { exec, spawn } = require("child_process");
const path = require("path");

/**
 * Executes a command inside the Docker runner container.
 * Streams stdout/stderr via the provided socket.io instance.
 */
function runInContainer(command, socket, options = {}) {
  const containerName = process.env.RUNNER_CONTAINER_NAME || "codeecho-runner";
  const timeout = options.timeout || 30000; // 30s default timeout

  // Construct docker exec command
  // We run as the 'runner' user inside /sandbox
  const dockerCmd = "docker";
  const dockerArgs = [
    "exec",
    "-i", // interactive to keep stdin open if needed
    containerName,
    "sh",
    "-c",
    command,
  ];

  socket.emit("command_output", {
    type: "info",
    data: `[Runner] Executing: ${command}`,
  });

  const child = spawn(dockerCmd, dockerArgs);

  // Stream stdout
  child.stdout.on("data", (data) => {
    socket.emit("command_output", {
      type: "stdout",
      data: data.toString(),
    });
  });

  // Stream stderr
  child.stderr.on("data", (data) => {
    socket.emit("command_output", {
      type: "stderr",
      data: data.toString(),
    });
  });

  // Handle errors
  child.on("error", (error) => {
    socket.emit("command_output", {
      type: "error",
      data: `Spawn error: ${error.message}`,
    });
  });

  // Handle exit
  child.on("close", (code) => {
    socket.emit("command_output", {
      type: "info",
      data: `[Runner] Process exited with code ${code}`,
    });
  });

  // Safety timeout
  setTimeout(() => {
    if (!child.killed) {
      child.kill();
      socket.emit("command_output", {
        type: "error",
        data: "[Runner] Command timed out.",
      });
    }
  }, timeout);
}

module.exports = { runInContainer };
