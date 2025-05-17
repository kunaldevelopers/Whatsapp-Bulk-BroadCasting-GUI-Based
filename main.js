const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const Store = require("electron-store").default;
const logger = require("./src/logger");

// Initialize store for app settings
let store;
try {
  store = new Store();
  logger.info("Store initialized successfully");
} catch (error) {
  logger.error("Failed to initialize store: " + error.message);
  // Create a fallback memory-based store
  store = {
    get: (key, defaultValue) => {
      return store[key] !== undefined ? store[key] : defaultValue;
    },
    set: (key, value) => {
      store[key] = value;
      return true;
    },
  };
}

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "assets", "whatsapp-logo.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  }); // Load the HTML file
  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

  // Open DevTools in development mode (optional)
  // mainWindow.webContents.openDevTools();

  // Window closed event
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC handlers for communication with renderer process

// Handle contact file selection
ipcMain.handle("select-contacts-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Handle image file selection
ipcMain.handle("select-image-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Image Files", extensions: ["jpg", "jpeg", "png", "gif"] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Handle PDF file selection
ipcMain.handle("select-pdf-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Save settings
ipcMain.handle("save-settings", (event, settings) => {
  Object.keys(settings).forEach((key) => {
    store.set(key, settings[key]);
  });
  return true;
});

// Handle app settings
ipcMain.handle("get-settings", () => {
  return {
    minDelay: store.get("minDelay", 2),
    maxDelay: store.get("maxDelay", 5),
    minDelayPdf: store.get("minDelayPdf", 5),
    maxDelayPdf: store.get("maxDelayPdf", 10),
    lastContactsFile: store.get("lastContactsFile", ""),
    lastImageFile: store.get("lastImageFile", ""),
    lastPdfFile: store.get("lastPdfFile", ""),
    savedTemplates: store.get("savedTemplates", []),
  };
});

// Check if a WhatsApp session exists
ipcMain.handle("check-whatsapp-session", () => {
  const sessionDir = path.join(
    app.getPath("userData"),
    ".wwebjs_auth",
    "session-whatsapp-messenger"
  );
  try {
    if (fs.existsSync(sessionDir)) {
      logger.info("WhatsApp session directory exists");
      // Check for some key session files that would indicate a valid session
      const files = fs.readdirSync(sessionDir);
      return files.length > 0;
    }
    logger.info("No WhatsApp session found");
    return false;
  } catch (error) {
    logger.error("Error checking WhatsApp session: " + error.message);
    return false;
  }
});

// Save message template
ipcMain.handle("save-template", (event, template) => {
  const templates = store.get("savedTemplates", []);
  templates.push(template);
  store.set("savedTemplates", templates);
  return true;
});

// Delete message template
ipcMain.handle("delete-template", (event, index) => {
  const templates = store.get("savedTemplates", []);
  templates.splice(index, 1);
  store.set("savedTemplates", templates);
  return true;
});

// Export logs to a file
ipcMain.handle("export-logs", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export Logs",
    defaultPath: path.join(
      app.getPath("documents"),
      "whatsapp-messenger-logs.txt"
    ),
    filters: [{ name: "Text Files", extensions: ["txt"] }],
  });

  if (!result.canceled && result.filePath) {
    const success = logger.exportLogs(result.filePath);
    return { success, filePath: result.filePath };
  }
  return { success: false };
});

// Check application version
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// Check if a file exists
ipcMain.handle("check-file-exists", (event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    logger.error(`Error checking if file exists: ${error.message}`);
    return false;
  }
});

// Reset WhatsApp session
ipcMain.handle("reset-whatsapp-session", () => {
  const sessionDir = path.join(app.getPath("userData"), ".wwebjs_auth");
  try {
    if (fs.existsSync(sessionDir)) {
      logger.info("Resetting WhatsApp session...");
      fs.rmSync(sessionDir, { recursive: true, force: true });

      // Also clean up any Puppeteer cache
      const puppeteerDir = path.join(
        app.getPath("userData"),
        ".cache",
        "puppeteer"
      );
      if (fs.existsSync(puppeteerDir)) {
        logger.info("Cleaning Puppeteer cache...");
        fs.rmSync(puppeteerDir, { recursive: true, force: true });
      }

      // Clean temporary browser data that might be corrupted
      const tempFiles = [
        path.join(app.getPath("userData"), "Cookies"),
        path.join(app.getPath("userData"), "Cookies-journal"),
        path.join(app.getPath("userData"), "GPUCache"),
      ];

      tempFiles.forEach((file) => {
        try {
          if (fs.existsSync(file)) {
            if (fs.lstatSync(file).isDirectory()) {
              fs.rmSync(file, { recursive: true, force: true });
            } else {
              fs.unlinkSync(file);
            }
            logger.info(`Removed potential conflicting file: ${file}`);
          }
        } catch (e) {
          logger.error(`Could not remove file ${file}: ${e.message}`);
        }
      });

      logger.info("WhatsApp session successfully reset");
      return { success: true, message: "Session successfully reset" };
    } else {
      logger.info("No WhatsApp session found to reset");
      return { success: true, message: "No session found to reset" };
    }
  } catch (error) {
    logger.error(`Error resetting WhatsApp session: ${error.message}`);
    return { success: false, message: `Error: ${error.message}` };
  }
});

// Get WhatsApp session directory
ipcMain.handle("get-session-dir", () => {
  return path.join(
    app.getPath("userData"),
    ".wwebjs_auth",
    "session-whatsapp-messenger"
  );
});

// Check for reset-session command line argument
const isResetSession = process.argv.includes("--reset-session");
if (isResetSession) {
  logger.info("Reset session flag detected. Will reset WhatsApp session.");
  app.whenReady().then(() => {
    const sessionDir = path.join(app.getPath("userData"), ".wwebjs_auth");
    if (fs.existsSync(sessionDir)) {
      logger.info("WhatsApp session directory found. Deleting...");
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        logger.info("WhatsApp session successfully reset.");
      } catch (error) {
        logger.error(`Error deleting session directory: ${error.message}`);
      }
    } else {
      logger.info("No WhatsApp session directory found. Nothing to reset.");
    }
  });
}

// Clean up Chromium processes that might interfere with WhatsApp connection
ipcMain.handle("clean-chromium-processes", async () => {
  try {
    logger.info("Checking for orphaned Chromium processes...");

    let processesKilled = 0;

    // The approach differs based on platform
    if (process.platform === "win32") {
      // Windows - use taskkill
      const { exec } = require("child_process");
      const util = require("util");
      const execPromise = util.promisify(exec);

      // Get all chrome processes
      const { stdout } = await execPromise(
        'tasklist /fi "IMAGENAME eq chrome.exe" /fo csv /nh'
      );

      if (stdout && stdout.includes("chrome.exe")) {
        // Found Chrome processes, try to kill them
        try {
          await execPromise("taskkill /F /IM chrome.exe");
          processesKilled = (stdout.match(/chrome\.exe/g) || []).length;
          logger.info(`Killed ${processesKilled} Chrome processes`);
        } catch (err) {
          logger.warn(`Error killing Chrome processes: ${err.message}`);
        }
      }

      // Also check for Electron/Chromium processes
      const { stdout: stdout2 } = await execPromise(
        'tasklist /fi "IMAGENAME eq Electron.exe" /fo csv /nh'
      );

      // Don't kill our own process, only orphaned ones
      const currentPid = process.pid;
      if (stdout2 && stdout2.includes("Electron.exe")) {
        const lines = stdout2.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          const match = line.match(/"Electron.exe","(\d+)"/);
          if (match && match[1]) {
            const pid = parseInt(match[1], 10);

            // Skip our own process
            if (pid !== currentPid) {
              try {
                await execPromise(`taskkill /F /PID ${pid}`);
                processesKilled++;
                logger.info(`Killed orphaned Electron process with PID ${pid}`);
              } catch (err) {
                logger.warn(
                  `Error killing Electron process ${pid}: ${err.message}`
                );
              }
            }
          }
        }
      }
    } else if (process.platform === "darwin") {
      // macOS - use pkill
      const { exec } = require("child_process");
      const util = require("util");
      const execPromise = util.promisify(exec);

      try {
        await execPromise('pkill -f "Google Chrome"');
        processesKilled += 1; // Approximate, pkill doesn't return count
        logger.info("Killed Chrome processes on macOS");
      } catch (err) {
        // pkill returns non-zero if no processes found, which throws an error
        logger.info("No Chrome processes found to kill on macOS");
      }

      try {
        // Kill Electron processes but not our own
        await execPromise(`pkill -f Electron && ! -f ${process.pid}`);
        processesKilled += 1; // Approximate
        logger.info("Killed orphaned Electron processes on macOS");
      } catch (err) {
        logger.info("No orphaned Electron processes found on macOS");
      }
    } else {
      // Linux - use pkill
      const { exec } = require("child_process");
      const util = require("util");
      const execPromise = util.promisify(exec);

      try {
        await execPromise("pkill chrome");
        processesKilled += 1; // Approximate
        logger.info("Killed Chrome processes on Linux");
      } catch (err) {
        logger.info("No Chrome processes found to kill on Linux");
      }

      try {
        // Kill Electron processes but not our own
        await execPromise(`pkill -f "electron" | grep -v ${process.pid}`);
        processesKilled += 1; // Approximate
        logger.info("Killed orphaned Electron processes on Linux");
      } catch (err) {
        logger.info("No orphaned Electron processes found on Linux");
      }
    }

    return {
      success: true,
      message: "Process cleanup completed successfully",
      processesKilled,
    };
  } catch (error) {
    logger.error(`Error cleaning processes: ${error.message}`);
    return { success: false, message: error.message };
  }
});

// Restart the application
ipcMain.handle("restart-app", () => {
  logger.info("Restarting application...");
  app.relaunch();
  app.exit();
});

// Check WhatsApp session integrity
ipcMain.handle("check-session-integrity", () => {
  const sessionDir = path.join(
    app.getPath("userData"),
    ".wwebjs_auth",
    "session-whatsapp-messenger"
  );
  logger.info(`Checking integrity of WhatsApp session in: ${sessionDir}`);

  const result = checkSessionIntegrity(sessionDir);

  // Log the result
  if (result.valid) {
    logger.info("WhatsApp session integrity check passed");
  } else {
    logger.warn(
      `WhatsApp session may be corrupted: ${result.details.join(", ")}`
    );
    logger.info(`Recommendation: ${result.recommendation}`);
  }

  return result;
});
