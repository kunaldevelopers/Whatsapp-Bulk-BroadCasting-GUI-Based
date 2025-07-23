/**
 * WhatsApp Connection Debugging Tool
 *
 * This script helps troubleshoot connection issues by providing step-by-step
 * verification of WhatsApp connection process.
 */

// Use the already declared ipcRenderer from renderer.js
// const { ipcRenderer } = require("electron"); - moved to global scope in renderer.js
// Use the globally available WhatsApp Web.js classes from renderer.js
// const { Client, LocalAuth } = require("whatsapp-web.js"); - moved to global scope in renderer.js
// Use the globally available QRCode from renderer.js
// const QRCode = require("qrcode"); - moved to global scope in renderer.js

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Setup UI references
  const debugBtn = document.createElement("button");
  debugBtn.className = "btn btn-outline-info ms-2";
  debugBtn.innerHTML = '<i class="bi bi-bug"></i> Debug Connection';

  // Add debug button next to connect button
  const connectBtn = document.getElementById("connectBtn");
  if (connectBtn && connectBtn.parentNode) {
    connectBtn.parentNode.appendChild(debugBtn);
  }

  // Add event listener for debug button
  debugBtn.addEventListener("click", runConnectionDiagnostics);
});

/**
 * Run connection diagnostics to identify issues
 */
async function runConnectionDiagnostics() {
  const qrcodeContainer = document.getElementById("qrcode");
  const logContainer = document.getElementById("logContainer");

  // Show diagnostic starting message
  qrcodeContainer.innerHTML = `
    <div class="text-center">
      <p class="text-info"><i class="bi bi-gear-wide-connected spin"></i> Connection Diagnostics</p>
      <div class="progress mb-3">
        <div id="diagnosticProgress" class="progress-bar progress-bar-striped progress-bar-animated bg-info" 
             role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <div id="diagnosticMessage" class="text-muted small">Starting diagnostics...</div>
    </div>
  `;

  // Helper function to update diagnostic progress
  function updateProgress(percent, message) {
    const progressBar = document.getElementById("diagnosticProgress");
    const messageDisplay = document.getElementById("diagnosticMessage");

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressBar) progressBar.setAttribute("aria-valuenow", percent);
    if (messageDisplay) messageDisplay.textContent = message;

    // Also log to log container
    if (logContainer) {
      const logEntry = document.createElement("div");
      logEntry.className = "log-entry log-info";
      logEntry.textContent = `[Diagnostic] ${message}`;
      logContainer.appendChild(logEntry);
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  // Helper function to display errors
  function showError(message, details = "") {
    qrcodeContainer.innerHTML = `
      <div class="text-center">
        <p class="text-danger mb-2"><i class="bi bi-exclamation-triangle"></i> Connection Issue Detected</p>
        <p>${message}</p>
        ${details ? `<p class="small text-muted">${details}</p>` : ""}
        <button class="btn btn-outline-primary mt-3" onclick="location.reload()">Reload Application</button>
      </div>
    `;

    // Also log to log container
    if (logContainer) {
      const logEntry = document.createElement("div");
      logEntry.className = "log-entry log-error";
      logEntry.textContent = `[Diagnostic Error] ${message}`;
      logContainer.appendChild(logEntry);
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  try {
    // Step 1: Check session directory
    updateProgress(10, "Checking for WhatsApp session data...");
    let hasSession;
    try {
      hasSession = await window.ipcRenderer.invoke("check-whatsapp-session");
    } catch (error) {
      showError("Failed to check WhatsApp session", error.message);
      return;
    }

    // Step 2: Test session directory access
    updateProgress(20, "Testing session directory access...");
    const sessionDir = await window.ipcRenderer.invoke("get-session-dir");

    updateProgress(30, "Creating test connection...");

    // Step 3: Create a test client to validate connection
    const testClient = new window.WhatsAppWebJS.Client({
      authStrategy: new window.WhatsAppWebJS.LocalAuth({
        clientId: "whatsapp-messenger-test",
        dataPath: sessionDir.replace("session-whatsapp-messenger", ""), // Use parent dir
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      },
    });

    // Step 4: Track connection events
    updateProgress(40, "Initializing test connection...");

    // Track QR code event
    let qrReceived = false;
    testClient.on("qr", (qr) => {
      qrReceived = true;
      updateProgress(70, "QR code system working properly!");

      // Generate QR code
      window.QRCode.toDataURL(qr, { width: 300 }, (err, url) => {
        if (err) {
          showError("Error generating QR code", err.message);
          return;
        }

        qrcodeContainer.innerHTML = `
          <div class="text-center">
            <p class="text-success mb-3"><i class="bi bi-check-circle"></i> QR code system is working!</p>
            <p>Here's your QR code to connect:</p>
            <img src="${url}" alt="QR Code" class="mb-3">
            <p class="small text-muted">Scan this with your WhatsApp mobile app</p>
          </div>
        `;
      });

      // Clean up after 60 seconds
      setTimeout(() => {
        try {
          testClient.destroy();
        } catch (e) {}
      }, 60000);
    });

    // Track loading screen event
    testClient.on("loading_screen", (percent, message) => {
      updateProgress(60, `Session loading works! Progress: ${percent}%`);
    });

    // Track authenticated event
    testClient.on("authenticated", () => {
      updateProgress(90, "Authentication successful!");
    });

    // Initialize client
    await testClient.initialize().catch((err) => {
      // This is expected in test mode
      updateProgress(50, "Testing connection capabilities...");
    });

    // Step 5: Final validation and recommendations
    setTimeout(() => {
      if (!qrReceived) {
        // If we never got a QR code, something might be wrong
        showError(
          "The connection system is not displaying QR codes properly",
          "Try running reset-whatsapp-session.bat from the application directory, then restart the application."
        );
      } else {
        updateProgress(
          100,
          "Diagnostics complete! Connection system appears to be working."
        );
      }

      // Clean up test client
      try {
        testClient.destroy();
      } catch (e) {}
    }, 15000); // Wait 15 seconds for events
  } catch (error) {
    showError("Connection diagnostic failed", error.message);
  }
}
