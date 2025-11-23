const fs = require("fs").promises;
const path = require("path");

/**
 * FileManager Service
 *
 * Manages multiple files in a single chat session for single-user scenarios.
 * Tracks open files, stores content, and handles file operations.
 *
 * Features:
 * - Add/remove files from session
 * - Track active file
 * - Store file content and metadata
 * - Persist file-specific results (metrics, tests, AI analysis)
 */

class FileManagerService {
  constructor() {
    // Single-user session storage
    this.session = {
      files: new Map(), // fileId -> file object
      activeFileId: null,
      nextFileId: 1,
      createdAt: Date.now(),
    };
  }

  /**
   * Add a new file to the session
   * @param {string} filePath - Absolute or relative path to file
   * @param {string} content - File content (optional, will read if not provided)
   * @returns {Object} File object with id, path, content, metadata
   */
  async addFile(filePath, content = null) {
    try {
      // Check if file already exists in session
      for (const [id, file] of this.session.files) {
        if (file.path === filePath) {
          // File already open, just activate it
          this.session.activeFileId = id;
          return file;
        }
      }

      // Read file content if not provided
      let fileContent = content;
      if (fileContent === null) {
        try {
          fileContent = await fs.readFile(filePath, "utf-8");
        } catch (err) {
          console.warn(`Could not read file ${filePath}: ${err.message}`);
          fileContent = ""; // Empty content for new files
        }
      }

      // Detect language from file extension
      const language = this.detectLanguage(filePath);

      // Create file object
      const fileId = `file_${this.session.nextFileId++}`;
      const file = {
        id: fileId,
        path: filePath,
        name: path.basename(filePath),
        content: fileContent,
        language,
        savedContent: fileContent, // Track saved state
        isDirty: false,
        createdAt: Date.now(),
        lastModified: Date.now(),
        results: {
          metrics: null,
          tests: null,
          review: null,
          predictions: null,
        },
      };

      this.session.files.set(fileId, file);
      this.session.activeFileId = fileId;

      return file;
    } catch (error) {
      throw new Error(`Failed to add file: ${error.message}`);
    }
  }

  /**
   * Remove a file from the session
   * @param {string} fileId - File ID to remove
   * @returns {boolean} Success status
   */
  removeFile(fileId) {
    const deleted = this.session.files.delete(fileId);

    if (deleted && this.session.activeFileId === fileId) {
      // If we deleted the active file, activate another one
      const fileIds = Array.from(this.session.files.keys());
      this.session.activeFileId = fileIds.length > 0 ? fileIds[0] : null;
    }

    return deleted;
  }

  /**
   * Get a file by ID
   * @param {string} fileId - File ID
   * @returns {Object|null} File object or null
   */
  getFile(fileId) {
    return this.session.files.get(fileId) || null;
  }

  /**
   * Get all files in the session
   * @returns {Array} Array of file objects
   */
  getAllFiles() {
    return Array.from(this.session.files.values());
  }

  /**
   * Get the active file
   * @returns {Object|null} Active file object or null
   */
  getActiveFile() {
    if (!this.session.activeFileId) return null;
    return this.session.files.get(this.session.activeFileId) || null;
  }

  /**
   * Set the active file
   * @param {string} fileId - File ID to activate
   * @returns {boolean} Success status
   */
  setActiveFile(fileId) {
    if (!this.session.files.has(fileId)) {
      return false;
    }
    this.session.activeFileId = fileId;
    return true;
  }

  /**
   * Update file content
   * @param {string} fileId - File ID
   * @param {string} content - New content
   * @returns {Object|null} Updated file object or null
   */
  updateFileContent(fileId, content) {
    const file = this.session.files.get(fileId);
    if (!file) return null;

    file.content = content;
    file.isDirty = content !== file.savedContent;
    file.lastModified = Date.now();

    return file;
  }

  /**
   * Save file content to disk
   * @param {string} fileId - File ID
   * @returns {Object} Result with success status
   */
  async saveFile(fileId) {
    const file = this.session.files.get(fileId);
    if (!file) {
      return { success: false, error: "File not found" };
    }

    try {
      await fs.writeFile(file.path, file.content, "utf-8");
      file.savedContent = file.content;
      file.isDirty = false;
      file.lastModified = Date.now();

      return { success: true, file };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Store results for a file
   * @param {string} fileId - File ID
   * @param {string} resultType - Type: 'metrics', 'tests', 'review', 'predictions'
   * @param {Object} data - Result data
   * @returns {Object|null} Updated file object or null
   */
  storeFileResults(fileId, resultType, data) {
    const file = this.session.files.get(fileId);
    if (!file) return null;

    if (!file.results[resultType]) {
      file.results[resultType] = [];
    }

    // Store with timestamp
    file.results[resultType] = {
      data,
      timestamp: Date.now(),
    };

    return file;
  }

  /**
   * Get results for a file
   * @param {string} fileId - File ID
   * @param {string} resultType - Type: 'metrics', 'tests', 'review', 'predictions'
   * @returns {Object|null} Result data or null
   */
  getFileResults(fileId, resultType) {
    const file = this.session.files.get(fileId);
    if (!file) return null;

    return file.results[resultType] || null;
  }

  /**
   * Clear all results for a file
   * @param {string} fileId - File ID
   * @returns {boolean} Success status
   */
  clearFileResults(fileId) {
    const file = this.session.files.get(fileId);
    if (!file) return false;

    file.results = {
      metrics: null,
      tests: null,
      review: null,
      predictions: null,
    };

    return true;
  }

  /**
   * Detect programming language from file extension
   * @param {string} filePath - File path
   * @returns {string} Language identifier
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
      ".js": "javascript",
      ".jsx": "javascriptreact",
      ".ts": "typescript",
      ".tsx": "typescriptreact",
      ".py": "python",
      ".java": "java",
      ".cpp": "cpp",
      ".cc": "cpp",
      ".cxx": "cpp",
      ".c": "c",
      ".h": "c",
      ".hpp": "cpp",
      ".cs": "csharp",
      ".go": "go",
      ".rs": "rust",
      ".rb": "ruby",
      ".php": "php",
      ".swift": "swift",
      ".kt": "kotlin",
      ".scala": "scala",
      ".sh": "shell",
      ".bash": "shell",
      ".json": "json",
      ".xml": "xml",
      ".html": "html",
      ".css": "css",
      ".scss": "scss",
      ".sql": "sql",
      ".md": "markdown",
      ".yaml": "yaml",
      ".yml": "yaml",
    };

    return languageMap[ext] || "plaintext";
  }

  /**
   * Get session statistics
   * @returns {Object} Session stats
   */
  getSessionStats() {
    const files = this.getAllFiles();
    return {
      totalFiles: files.length,
      activeFileId: this.session.activeFileId,
      dirtyFiles: files.filter((f) => f.isDirty).length,
      languages: [...new Set(files.map((f) => f.language))],
      sessionAge: Date.now() - this.session.createdAt,
    };
  }

  /**
   * Clear the entire session
   */
  clearSession() {
    this.session.files.clear();
    this.session.activeFileId = null;
    this.session.createdAt = Date.now();
  }

  /**
   * Export session data (for IDE plugin sync)
   * @returns {Object} Serializable session data
   */
  exportSession() {
    return {
      files: Array.from(this.session.files.entries()).map(([id, file]) => ({
        id,
        path: file.path,
        name: file.name,
        content: file.content,
        language: file.language,
        isDirty: file.isDirty,
        results: file.results,
      })),
      activeFileId: this.session.activeFileId,
      stats: this.getSessionStats(),
    };
  }

  /**
   * Import session data (for IDE plugin sync)
   * @param {Object} sessionData - Session data to import
   */
  importSession(sessionData) {
    this.session.files.clear();

    for (const fileData of sessionData.files) {
      const file = {
        id: fileData.id,
        path: fileData.path,
        name: fileData.name,
        content: fileData.content,
        language: fileData.language,
        savedContent: fileData.content,
        isDirty: fileData.isDirty || false,
        createdAt: Date.now(),
        lastModified: Date.now(),
        results: fileData.results || {
          metrics: null,
          tests: null,
          review: null,
          predictions: null,
        },
      };
      this.session.files.set(file.id, file);
    }

    this.session.activeFileId = sessionData.activeFileId || null;
  }
}

// Export singleton instance for single-user scenario
const fileManagerService = new FileManagerService();

module.exports = fileManagerService;
