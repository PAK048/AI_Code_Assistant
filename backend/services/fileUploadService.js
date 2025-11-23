const UploadedFile = require("../models/UploadedFile");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");

/**
 * File Upload Service
 * Manages file uploads, storage, and metadata
 */
class FileUploadService {
  /**
   * Process and store uploaded file
   */
  async uploadFile(userId, sessionId, fileData) {
    try {
      const {
        name,
        originalName,
        path: filePath,
        mimeType,
        size,
        uploadType = "single_file",
        source = "web_upload",
      } = fileData;

      // Read file content
      const content = await fs.readFile(filePath, "utf-8").catch(() => null);

      // Calculate file hash
      const hash = this.calculateFileHash(content || filePath);

      // Detect language
      const language = this.detectLanguage(originalName);

      // Calculate metadata
      const metadata = this.calculateMetadata(content);

      const uploadedFile = new UploadedFile({
        userId,
        sessionId,
        uploadType,
        name,
        originalName,
        path: filePath,
        mimeType,
        language,
        size,
        content,
        metadata: {
          ...metadata,
          hash,
          extension: path.extname(originalName),
        },
        source,
        processing: {
          status: "completed",
          indexed: false,
          embedded: false,
          analyzed: false,
        },
      });

      await uploadedFile.save();

      return uploadedFile;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  /**
   * Upload project folder
   */
  async uploadProjectFolder(userId, sessionId, folderData) {
    try {
      const { name, rootPath, files, source = "web_upload" } = folderData;

      // Calculate total size and collect languages
      let totalSize = 0;
      const languages = new Set();

      files.forEach((file) => {
        totalSize += file.size;
        if (file.language) {
          languages.add(file.language);
        }
      });

      const uploadedFolder = new UploadedFile({
        userId,
        sessionId,
        uploadType: "project_folder",
        name,
        originalName: name,
        path: rootPath,
        size: totalSize,
        source,
        projectStructure: {
          isProject: true,
          rootPath,
          files,
          totalFiles: files.length,
          totalSize,
          languages: Array.from(languages),
        },
        processing: {
          status: "completed",
          indexed: false,
          embedded: false,
          analyzed: false,
        },
      });

      await uploadedFolder.save();

      return uploadedFolder;
    } catch (error) {
      console.error("Error uploading project folder:", error);
      throw error;
    }
  }

  /**
   * Get uploaded file by ID
   */
  async getFileById(fileId) {
    try {
      const file = await UploadedFile.findById(fileId);

      if (file) {
        await file.incrementAccess();
      }

      return file;
    } catch (error) {
      console.error("Error getting file by ID:", error);
      throw error;
    }
  }

  /**
   * Get user uploaded files
   */
  async getUserFiles(userId, filters = {}, limit = 50, skip = 0) {
    try {
      const query = { userId };

      if (filters.uploadType) {
        query.uploadType = filters.uploadType;
      }

      if (filters.language) {
        query.language = filters.language;
      }

      if (filters.sessionId) {
        query.sessionId = filters.sessionId;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate)
          query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const files = await UploadedFile.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return files;
    } catch (error) {
      console.error("Error getting user files:", error);
      throw error;
    }
  }

  /**
   * Get recent files
   */
  async getRecentFiles(userId, limit = 10) {
    try {
      const files = await UploadedFile.getRecentFiles(userId, limit);
      return files;
    } catch (error) {
      console.error("Error getting recent files:", error);
      throw error;
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(fileId, metadata) {
    try {
      const file = await UploadedFile.findByIdAndUpdate(
        fileId,
        {
          ...metadata,
          updatedAt: new Date(),
        },
        { new: true }
      );

      return file;
    } catch (error) {
      console.error("Error updating file metadata:", error);
      throw error;
    }
  }

  /**
   * Add tags to file
   */
  async addTags(fileId, tags) {
    try {
      const file = await UploadedFile.findByIdAndUpdate(
        fileId,
        {
          $addToSet: { tags: { $each: tags } },
          updatedAt: new Date(),
        },
        { new: true }
      );

      return file;
    } catch (error) {
      console.error("Error adding tags:", error);
      throw error;
    }
  }

  /**
   * Mark file as processed
   */
  async markAsProcessed(fileId, embedded = false, analyzed = false) {
    try {
      const file = await UploadedFile.findById(fileId);

      if (!file) {
        throw new Error("File not found");
      }

      await file.markProcessed(embedded, analyzed);
      return file;
    } catch (error) {
      console.error("Error marking file as processed:", error);
      throw error;
    }
  }

  /**
   * Store file analysis results
   */
  async storeAnalysisResults(fileId, analysis) {
    try {
      const file = await UploadedFile.findByIdAndUpdate(
        fileId,
        {
          analysis,
          "processing.analyzed": true,
          updatedAt: new Date(),
        },
        { new: true }
      );

      return file;
    } catch (error) {
      console.error("Error storing analysis results:", error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics(userId) {
    try {
      const totalStorage = await UploadedFile.getTotalStorageUsed(userId);
      const filesByLanguage = await UploadedFile.getFilesByLanguage(userId);

      const fileCount = await UploadedFile.countDocuments({ userId });
      const projectCount = await UploadedFile.countDocuments({
        userId,
        uploadType: "project_folder",
      });

      return {
        totalStorage,
        totalFiles: fileCount,
        totalProjects: projectCount,
        byLanguage: filesByLanguage,
      };
    } catch (error) {
      console.error("Error getting storage statistics:", error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId) {
    try {
      const file = await UploadedFile.findById(fileId);

      if (!file) {
        throw new Error("File not found");
      }

      // Delete physical file if exists
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.warn("Physical file not found or already deleted:", file.path);
      }

      await UploadedFile.deleteOne({ _id: fileId });
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }

  /**
   * Search files
   */
  async searchFiles(userId, query, limit = 20) {
    try {
      const files = await UploadedFile.find({
        userId,
        $or: [
          { name: { $regex: query, $options: "i" } },
          { originalName: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { tags: { $regex: query, $options: "i" } },
        ],
      })
        .sort({ lastAccessedAt: -1 })
        .limit(limit);

      return files;
    } catch (error) {
      console.error("Error searching files:", error);
      throw error;
    }
  }

  /**
   * Calculate file hash
   */
  calculateFileHash(content) {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(filename) {
    const ext = path.extname(filename).toLowerCase();
    const languageMap = {
      ".js": "javascript",
      ".jsx": "javascript",
      ".ts": "typescript",
      ".tsx": "typescript",
      ".py": "python",
      ".java": "java",
      ".cpp": "cpp",
      ".c": "c",
      ".cs": "csharp",
      ".rb": "ruby",
      ".go": "go",
      ".rs": "rust",
      ".php": "php",
      ".swift": "swift",
      ".kt": "kotlin",
      ".scala": "scala",
      ".r": "r",
      ".m": "objective-c",
      ".html": "html",
      ".css": "css",
      ".scss": "scss",
      ".json": "json",
      ".xml": "xml",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".md": "markdown",
      ".sql": "sql",
      ".sh": "bash",
      ".ps1": "powershell",
    };

    return languageMap[ext] || "text";
  }

  /**
   * Calculate file metadata
   */
  calculateMetadata(content) {
    if (!content) {
      return {
        lineCount: 0,
        characterCount: 0,
      };
    }

    const lines = content.split("\n");

    return {
      lineCount: lines.length,
      characterCount: content.length,
      encoding: "utf-8",
    };
  }
}

module.exports = new FileUploadService();
