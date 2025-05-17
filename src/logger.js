class Logger {
  constructor() {
    this.logs = [];
    this.logLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  addEntry(level, message) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      message,
    };

    this.logs.push(entry);

    // Format console output based on level
    switch (level) {
      case "debug":
        console.debug(`[${timestamp}] [DEBUG] ${message}`);
        break;
      case "info":
        console.info(`[${timestamp}] [INFO] ${message}`);
        break;
      case "warn":
        console.warn(`[${timestamp}] [WARN] ${message}`);
        break;
      case "error":
        console.error(`[${timestamp}] [ERROR] ${message}`);
        break;
    }
  }

  debug(message) {
    this.addEntry("debug", message);
  }

  info(message) {
    this.addEntry("info", message);
  }

  warn(message) {
    this.addEntry("warn", message);
  }

  error(message) {
    this.addEntry("error", message);
  }

  getLogs(level = null) {
    if (!level) return this.logs;
    return this.logs.filter((entry) => entry.level === level);
  }

  getRecentLogs(count = 50, level = null) {
    const logs = level ? this.getLogs(level) : this.logs;
    return logs.slice(-count);
  }

  exportLogs(filePath) {
    const fs = require("fs");
    const logText = this.logs
      .map(
        (entry) =>
          `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`
      )
      .join("\n");

    try {
      fs.writeFileSync(filePath, logText);
      return true;
    } catch (error) {
      console.error("Failed to export logs:", error);
      return false;
    }
  }
}

module.exports = new Logger();
