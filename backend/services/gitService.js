const { exec } = require("child_process");
const { promisify } = require("util");
const axios = require("axios");

const execAsync = promisify(exec);

/**
 * Git service for branch management, commits, and GitHub PR creation.
 */

/**
 * Create a new branch
 */
async function createBranch(branchName, basePath = "./sandbox") {
  try {
    const { stdout } = await execAsync(`git checkout -b ${branchName}`, {
      cwd: basePath,
    });
    return { success: true, branch: branchName, output: stdout };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Stage and commit files
 */
async function commitChanges(message, files = ["."], basePath = "./sandbox") {
  try {
    // Stage files
    const filesArg = files.join(" ");
    await execAsync(`git add ${filesArg}`, { cwd: basePath });

    // Commit
    const { stdout } = await execAsync(`git commit -m "${message}"`, {
      cwd: basePath,
    });

    // Get commit hash
    const { stdout: hash } = await execAsync("git rev-parse HEAD", {
      cwd: basePath,
    });

    return { success: true, commitHash: hash.trim(), output: stdout };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Push branch to remote
 */
async function pushBranch(
  branchName,
  remote = "origin",
  basePath = "./sandbox"
) {
  try {
    const { stdout } = await execAsync(`git push -u ${remote} ${branchName}`, {
      cwd: basePath,
    });
    return { success: true, output: stdout };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a GitHub Pull Request
 */
async function createPullRequest({
  title,
  body,
  head,
  base = "main",
  owner,
  repo,
}) {
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    return { success: false, error: "GITHUB_TOKEN not configured" };
  }

  try {
    const response = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        title,
        body,
        head,
        base,
      },
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    return {
      success: true,
      prNumber: response.data.number,
      prUrl: response.data.html_url,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Get current branch name
 */
async function getCurrentBranch(basePath = "./sandbox") {
  try {
    const { stdout } = await execAsync("git branch --show-current", {
      cwd: basePath,
    });
    return { success: true, branch: stdout.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if there are uncommitted changes
 */
async function hasUncommittedChanges(basePath = "./sandbox") {
  try {
    const { stdout } = await execAsync("git status --porcelain", {
      cwd: basePath,
    });
    return { hasChanges: stdout.trim().length > 0, output: stdout };
  } catch (error) {
    return { hasChanges: false, error: error.message };
  }
}

module.exports = {
  createBranch,
  commitChanges,
  pushBranch,
  createPullRequest,
  getCurrentBranch,
  hasUncommittedChanges,
};
