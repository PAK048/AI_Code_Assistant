const mongoose = require("mongoose");

/**
 * UploadedFile Model
 * Manages user uploaded files (single files or full project folders)
 * Tracks file metadata, content, and processing status
 */
const uploadedFileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      index: true,
    },
    uploadType: {
      type: String,
      enum: ["single_file", "project_folder", "archive"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    relativePath: {
      type: String,
    },
    mimeType: {
      type: String,
    },
    language: {
      type: String,
    },
    size: {
      type: Number,
      required: true,
    },
    content: {
      type: String, // For code files, store content directly
    },
    metadata: {
      encoding: { type: String },
      lineCount: { type: Number },
      characterCount: { type: Number },
      hash: { type: String }, // File hash for deduplication
      extension: { type: String },
    },
    // For project folders
    projectStructure: {
      isProject: { type: Boolean, default: false },
      rootPath: { type: String },
      files: [
        {
          path: { type: String },
          name: { type: String },
          language: { type: String },
          size: { type: Number },
        },
      ],
      totalFiles: { type: Number, default: 0 },
      totalSize: { type: Number, default: 0 },
      languages: [{ type: String }],
    },
    processing: {
      status: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
        index: true,
      },
      indexed: { type: Boolean, default: false },
      embedded: { type: Boolean, default: false },
      analyzed: { type: Boolean, default: false },
      errorMessage: { type: String },
    },
    analysis: {
      complexity: { type: Number },
      linesOfCode: { type: Number },
      quality: { type: Number },
      issues: [
        {
          type: { type: String },
          severity: { type: String },
          message: { type: String },
          line: { type: Number },
        },
      ],
    },
    tags: [{ type: String }],
    description: { type: String },
    source: {
      type: String,
      enum: ["web_upload", "ide_plugin", "drag_drop", "api"],
      default: "web_upload",
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
uploadedFileSchema.index({ userId: 1, createdAt: -1 });
uploadedFileSchema.index({ sessionId: 1 });
uploadedFileSchema.index({ uploadType: 1 });
uploadedFileSchema.index({ language: 1 });
uploadedFileSchema.index({ "processing.status": 1 });
uploadedFileSchema.index({ "metadata.hash": 1 });
uploadedFileSchema.index({ tags: 1 });

// Method to increment access count
uploadedFileSchema.methods.incrementAccess = function () {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

// Method to mark as processed
uploadedFileSchema.methods.markProcessed = function (
  embedded = false,
  analyzed = false
) {
  this.processing.status = "completed";
  this.processing.indexed = true;
  this.processing.embedded = embedded;
  this.processing.analyzed = analyzed;
  return this.save();
};

// Static method to get total storage used
uploadedFileSchema.statics.getTotalStorageUsed = async function (userId) {
  const result = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, totalSize: { $sum: "$size" } } },
  ]);

  return result[0]?.totalSize || 0;
};

// Static method to get files by language
uploadedFileSchema.statics.getFilesByLanguage = async function (userId) {
  return await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        language: { $exists: true },
      },
    },
    {
      $group: {
        _id: "$language",
        count: { $sum: 1 },
        totalSize: { $sum: "$size" },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get recently uploaded files
uploadedFileSchema.statics.getRecentFiles = async function (
  userId,
  limit = 10
) {
  return await this.find({ userId: mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model("UploadedFile", uploadedFileSchema);
