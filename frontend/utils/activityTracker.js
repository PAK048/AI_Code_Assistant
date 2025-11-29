/**
 * Activity Tracking Utility
 * Automatically logs user activities to MongoDB for insights
 */

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

class ActivityTracker {
  constructor() {
    this.token = null;
    this.userId = null;
    this.sessionId = null;
    this.initialized = false;
  }

  /**
   * Initialize tracker with auth token
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Get token from localStorage
      this.token = localStorage.getItem("authToken");

      if (!this.token) {
        // Auto-login for single-user setup
        const response = await fetch(`${API_URL}/api/data/auth/auto-login`);
        const data = await response.json();
        this.token = data.token;
        this.userId = data.user.id;
        localStorage.setItem("authToken", this.token);
        localStorage.setItem("userId", this.userId);
      } else {
        this.userId = localStorage.getItem("userId");
      }

      // Get or create session
      await this.initializeSession();

      this.initialized = true;
      console.log("Activity tracker initialized");
    } catch (error) {
      console.error("Failed to initialize activity tracker:", error);
    }
  }

  /**
   * Initialize or get current session
   */
  async initializeSession() {
    try {
      // Check for existing active session
      const response = await fetch(`${API_URL}/api/data/sessions/active`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      const sessions = await response.json();

      if (sessions && sessions.length > 0) {
        this.sessionId = sessions[0].sessionId;
      } else {
        // Create new session
        const createResponse = await fetch(`${API_URL}/api/data/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            name: `Session ${new Date().toLocaleString()}`,
            source: "web",
          }),
        });

        const newSession = await createResponse.json();
        this.sessionId = newSession.sessionId;
      }

      localStorage.setItem("sessionId", this.sessionId);
    } catch (error) {
      console.error("Failed to initialize session:", error);
    }
  }

  /**
   * Track chat message
   */
  async trackChatMessage(role, content, metadata = {}) {
    if (!this.initialized) await this.initialize();
    if (!this.sessionId) return;

    try {
      await fetch(`${API_URL}/api/data/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          role,
          content,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (error) {
      console.error("Failed to track chat message:", error);
    }
  }

  /**
   * Track code execution
   */
  async trackExecution(executionData) {
    if (!this.initialized) await this.initialize();
    if (!this.sessionId || !this.userId) return;

    try {
      await fetch(`${API_URL}/api/data/execution/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          ...executionData,
          sessionId: this.sessionId,
          userId: this.userId,
        }),
      });
    } catch (error) {
      console.error("Failed to track execution:", error);
    }
  }

  /**
   * Track AI agent task
   */
  async trackAgentTask(taskData) {
    if (!this.initialized) await this.initialize();
    if (!this.sessionId || !this.userId) return;

    try {
      const response = await fetch(`${API_URL}/api/data/agent/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          ...taskData,
          sessionId: this.sessionId,
          userId: this.userId,
          performance: {
            startTime: new Date(),
          },
        }),
      });

      const task = await response.json();
      return task._id; // Return task ID for later updates
    } catch (error) {
      console.error("Failed to track agent task:", error);
      return null;
    }
  }

  /**
   * Update agent task status
   */
  async updateAgentTask(taskId, status, output = null, error = null) {
    if (!this.initialized) await this.initialize();
    if (!taskId) return;

    try {
      await fetch(`${API_URL}/api/data/agent/tasks/${taskId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          status,
          output,
          error,
        }),
      });
    } catch (error) {
      console.error("Failed to update agent task:", error);
    }
  }

  /**
   * Add user feedback to task
   */
  async addTaskFeedback(taskId, feedback) {
    if (!this.initialized) await this.initialize();
    if (!taskId) return;

    try {
      await fetch(`${API_URL}/api/data/agent/tasks/${taskId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(feedback),
      });
    } catch (error) {
      console.error("Failed to add task feedback:", error);
    }
  }

  /**
   * Track file upload
   */
  async trackFileUpload(fileData) {
    if (!this.initialized) await this.initialize();
    if (!this.sessionId || !this.userId) return;

    try {
      await fetch(`${API_URL}/api/data/files/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          ...fileData,
          sessionId: this.sessionId,
        }),
      });
    } catch (error) {
      console.error("Failed to track file upload:", error);
    }
  }

  /**
   * Update session context
   */
  async updateSessionContext(context) {
    if (!this.initialized) await this.initialize();
    if (!this.sessionId) return;

    try {
      await fetch(`${API_URL}/api/data/sessions/${this.sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          context,
        }),
      });
    } catch (error) {
      console.error("Failed to update session context:", error);
    }
  }

  /**
   * End current session
   */
  async endSession() {
    if (!this.initialized) await this.initialize();
    if (!this.sessionId) return;

    try {
      await fetch(`${API_URL}/api/data/sessions/${this.sessionId}/end`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      this.sessionId = null;
      localStorage.removeItem("sessionId");
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  }

  /**
   * Get user insights
   */
  async getInsights() {
    if (!this.initialized) await this.initialize();

    try {
      const response = await fetch(`${API_URL}/api/data/insights`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      return await response.json();
    } catch (error) {
      console.error("Failed to get insights:", error);
      return null;
    }
  }
}

// Export singleton instance
const tracker = new ActivityTracker();

// Auto-initialize on import
if (typeof window !== "undefined") {
  tracker.initialize().catch(console.error);
}

export default tracker;
