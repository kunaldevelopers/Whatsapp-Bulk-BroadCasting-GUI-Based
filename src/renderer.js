const { ipcRenderer } = require("electron");
const QRCode = require("qrcode");
const xlsx = require("xlsx");
const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const logger = require("./logger");

// DOM Elements
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const connectionStatus = document.getElementById("connectionStatus");
const qrcodeContainer = document.getElementById("qrcode");
const messageText = document.getElementById("messageText");
const previewBtn = document.getElementById("previewBtn");
const messagePreview = document.getElementById("messagePreview");
const selectImageBtn = document.getElementById("selectImageBtn");
const imageFilePath = document.getElementById("imageFilePath");
const selectPdfBtn = document.getElementById("selectPdfBtn");
const pdfFilePath = document.getElementById("pdfFilePath");
const pdfCaption = document.getElementById("pdfCaption");
const selectContactsBtn = document.getElementById("selectContactsBtn");
const contactsFilePath = document.getElementById("contactsFilePath");
const loadContactsBtn = document.getElementById("loadContactsBtn");
const contactsTableBody = document.getElementById("contactsTableBody");
const contactCount = document.getElementById("contactCount");
const startSendingBtn = document.getElementById("startSendingBtn");
const pauseResumeBtn = document.getElementById("pauseResumeBtn");
const stopSendingBtn = document.getElementById("stopSendingBtn");
const sendProgress = document.getElementById("sendProgress");
const sendStatus = document.getElementById("sendStatus");
const logContainer = document.getElementById("logContainer");
const minDelay = document.getElementById("minDelay");
const maxDelay = document.getElementById("maxDelay");
const minDelayPdf = document.getElementById("minDelayPdf");
const maxDelayPdf = document.getElementById("maxDelayPdf");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const saveTemplateBtn = document.getElementById("saveTemplateBtn");
const templateName = document.getElementById("templateName");
const templatesContainer = document.getElementById("templatesContainer");
const noTemplatesMessage = document.getElementById("noTemplatesMessage");
const refreshTemplatesBtn = document.getElementById("refreshTemplatesBtn");
const exportLogsBtn = document.getElementById("exportLogsBtn");
const resetSessionBtn = document.getElementById("resetSessionBtn");
const appVersion = document.getElementById("appVersion");

// Variables
let client = null;
let isClientInitialized = false;
let isClientReady = false;
let contacts = [];
let currentContactIndex = 0;
let isSending = false;
let isPaused = false;
let imageMedia = null;
let pdfMedia = null;

// Initialize the app
async function initializeApp() {
  try {
    addLog("Initializing application...", "info");

    // Load settings
    const settings = await ipcRenderer.invoke("get-settings");
    minDelay.value = settings.minDelay;
    maxDelay.value = settings.maxDelay;
    minDelayPdf.value = settings.minDelayPdf;
    maxDelayPdf.value = settings.maxDelayPdf;

    if (settings.lastContactsFile) {
      contactsFilePath.value = settings.lastContactsFile;
    }

    if (settings.lastImageFile) {
      imageFilePath.value = settings.lastImageFile;
    }

    if (settings.lastPdfFile) {
      pdfFilePath.value = settings.lastPdfFile;
    }

    // Load templates
    loadTemplates();

    // Initialize QR manager if available
    if (window.qrManager) {
      window.qrManager.initialize();
      addLog("QR code manager initialized", "info");
    }

    // Check if there's a saved WhatsApp session
    const hasSession = await ipcRenderer.invoke("check-whatsapp-session");
    if (hasSession) {
      if (window.qrManager) {
        // Use QR manager's UI
        qrcodeContainer.innerHTML =
          '<p class="text-info"><i class="bi bi-info-circle"></i> A saved WhatsApp session was found. Click Connect to use it.</p>';
      } else {
        qrcodeContainer.innerHTML =
          '<p class="text-info"><i class="bi bi-info-circle"></i> A saved WhatsApp session was found. Click Connect to use it.</p>';
      }
      addLog(
        "Found a saved WhatsApp session. You can click Connect to use it.",
        "info"
      );
    }

    // Get app version
    const version = await ipcRenderer.invoke("get-app-version");
    appVersion.innerText = `v${version}`;

    addLog("Application initialized successfully.", "success");
  } catch (error) {
    console.error("App initialization error:", error);
    addLog(`Error initializing application: ${error.message}`, "error");
  }
}

// Connect to WhatsApp
async function connectWhatsApp() {
  if (isClientInitialized) {
    addLog("WhatsApp client is already initialized.", "warning");
    return;
  }

  // Check session health before connecting
  const isSessionHealthy = await checkSessionHealth();
  if (!isSessionHealthy) {
    addLog(
      "Session health check failed. Please try resetting your session.",
      "warning"
    );
  }

  addLog("Initializing WhatsApp client...", "info");
  updateConnectionStatus("connecting");

  // Reset QR manager state if available
  if (window.qrManager) {
    window.qrManager.resetQR();
    window.qrManager.showGenerating();
  }

  // Initialize WhatsApp client with LocalAuth for session persistence
  client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-messenger" }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--window-size=1280,720",
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 1280,
        height: 720,
      },
    },
    qrMaxRetries: 5, // Increase from 3 to 5
    takeoverOnConflict: true,
  });

  // Event: QR Code received
  client.on("qr", (qr) => {
    addLog("QR Code received. Please scan with your phone.", "info");

    // Use QR manager if available, otherwise fallback to simple display
    if (window.qrManager) {
      window.qrManager.showQRCode(qr);
    } else {
      QRCode.toDataURL(qr, { width: 300 }, (err, url) => {
        if (err) {
          addLog("Error generating QR code: " + err.message, "error");
          return;
        }
        qrcodeContainer.innerHTML = `<img src="${url}" alt="QR Code">`;
      });
    }
  });

  // Event: Client is ready
  client.on("ready", () => {
    isClientReady = true;
    updateConnectionStatus("connected");

    if (window.qrManager) {
      window.qrManager.showConnected();
    } else {
      qrcodeContainer.innerHTML =
        '<p class="text-success"><i class="bi bi-check-circle-fill"></i> <strong>Connected to WhatsApp!</strong></p>';
    }

    addLog("WhatsApp client is ready!", "success");

    // Track successful connection
    trackConnectionFailure(false);
  });

  // Event: Client is loading session
  client.on("loading_screen", (percent, message) => {
    updateConnectionStatus("loading-session");

    if (window.qrManager) {
      // Pass to QR manager if available
      const status = message || "Connecting to WhatsApp...";
      addLog(`Loading session: ${percent}% - ${status}`, "info");
    } else {
      qrcodeContainer.innerHTML = `
        <p class="text-info"><i class="bi bi-arrow-repeat"></i> Loading saved session: ${percent}%</p>
        <div class="progress mb-3">
          <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: ${percent}%" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <p class="text-muted small">${
          message || "Connecting to WhatsApp..."
        }</p>
      `;
      addLog(
        `Loading session: ${percent}% - ${
          message || "Connecting to WhatsApp..."
        }`,
        "info"
      );
    }
  });

  // Event: Client is authenticated
  client.on("authenticated", (session) => {
    addLog("WhatsApp authentication successful. Session saved.", "success");

    if (window.qrManager) {
      window.qrManager.showScanning();
    } else {
      qrcodeContainer.innerHTML =
        '<p class="text-success"><i class="bi bi-check-circle"></i> Authentication successful. Finalizing...</p>';
    }
  });

  // Event: Client disconnected
  client.on("disconnected", (reason) => {
    isClientReady = false;
    isClientInitialized = false;
    updateConnectionStatus("disconnected");
    addLog("WhatsApp client disconnected: " + reason, "error");

    // Show error in QR manager if available
    if (window.qrManager) {
      window.qrManager.showError(`Disconnected: ${reason}`);
    } else {
      qrcodeContainer.innerHTML =
        '<p class="text-muted">Click Connect to use saved session or scan QR code</p>';
    }

    // Clean up the client properly
    if (client) {
      try {
        client.destroy();
      } catch (err) {
        console.error("Error destroying client:", err);
      }
    }
    client = null;

    // Enable connect button
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
  });

  // Initialize WhatsApp
  try {
    client.initialize().catch((err) => {
      addLog(`Error initializing WhatsApp client: ${err.message}`, "error");
      console.error("WhatsApp initialization error:", err);
      updateConnectionStatus("disconnected");

      if (window.qrManager) {
        window.qrManager.showError(`Connection error: ${err.message}`);
      } else {
        qrcodeContainer.innerHTML = `<p class="text-danger"><i class="bi bi-exclamation-triangle"></i> Connection error: ${err.message}</p>
          <p>Please try resetting the session from Settings and reconnect.</p>`;
      }

      connectBtn.disabled = false;
      disconnectBtn.disabled = true;

      // Track connection failure
      const failCount = trackConnectionFailure(true);
      if (failCount >= 3) {
        qrcodeContainer.innerHTML += `<p class="text-warning mt-3">Multiple connection failures detected. You may want to reset your session in Settings.</p>`;
      }
    });

    isClientInitialized = true;

    // Show session loading message
    if (window.qrManager) {
      window.qrManager.showGenerating();
    } else {
      // Fallback animation
      qrcodeContainer.innerHTML = `
        <div class="text-center">
          <div class="spinner-border text-success mb-3" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="text-info"><i class="bi bi-hourglass-split"></i> Checking for saved session...</p>
        </div>
      `;
    }

    // Update UI
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
  } catch (error) {
    addLog(`Failed to initialize WhatsApp client: ${error.message}`, "error");
    console.error("WhatsApp client setup error:", error);
    updateConnectionStatus("disconnected");

    if (window.qrManager) {
      window.qrManager.showError(`Setup error: ${error.message}`);
    } else {
      qrcodeContainer.innerHTML = `<p class="text-danger"><i class="bi bi-exclamation-triangle"></i> Setup error: ${error.message}</p>`;
    }

    connectBtn.disabled = false;
  }
}

// Disconnect from WhatsApp
function disconnectWhatsApp() {
  if (!isClientInitialized) {
    addLog("WhatsApp client is not initialized.", "warning");
    return;
  }
  addLog("Disconnecting from WhatsApp...", "info");

  try {
    if (client) {
      client.destroy();
      client = null;
    }

    isClientInitialized = false;
    isClientReady = false;
    updateConnectionStatus("disconnected");

    // Update UI with QR manager if available
    if (window.qrManager) {
      window.qrManager.resetQR();
      qrcodeContainer.innerHTML =
        '<p class="text-muted">Click Connect to use saved session or scan QR code</p>';
    } else {
      qrcodeContainer.innerHTML =
        '<p class="text-muted">Click Connect to use saved session or scan QR code</p>';
    }

    connectBtn.disabled = false;
    disconnectBtn.disabled = true;

    addLog(
      "Disconnected from WhatsApp. Your session is still saved for next time.",
      "info"
    );
  } catch (error) {
    console.error("Error during disconnect:", error);
    addLog(`Error during disconnect: ${error.message}`, "error");

    // Force reset UI state
    isClientInitialized = false;
    isClientReady = false;
    client = null;
    updateConnectionStatus("disconnected");
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
  }
}

// Update connection status
function updateConnectionStatus(status) {
  const statusElement = connectionStatus;

  switch (status) {
    case "disconnected":
      statusElement.innerHTML =
        '<span class="status-indicator status-disconnected"></span> Disconnected';
      break;
    case "connecting":
      statusElement.innerHTML =
        '<span class="status-indicator status-connecting"></span> Connecting...';
      break;
    case "loading-session":
      statusElement.innerHTML =
        '<span class="status-indicator status-connecting"></span> Loading saved session...';
      break;
    case "connected":
      statusElement.innerHTML =
        '<span class="status-indicator status-connected"></span> Connected';
      break;
  }
}

// Preview message
function previewMessage() {
  const text = messageText.value;
  if (!text) {
    messagePreview.innerText = "Your message preview will appear here...";
    return;
  }

  // Convert WhatsApp formatting to HTML
  let formattedText = text
    .replace(/\*/g, "<strong>*</strong>")
    .replace(/_(.*?)_/g, "<em>_$1_</em>");

  messagePreview.innerHTML = formattedText;
}

// Select contacts file
async function selectContactsFile() {
  const filePath = await ipcRenderer.invoke("select-contacts-file");
  if (filePath) {
    contactsFilePath.value = filePath;
    ipcRenderer.invoke("save-settings", { lastContactsFile: filePath });
    addLog(`Contacts file selected: ${filePath}`, "info");
  }
}

// Load contacts from file
function loadContactsFromFile() {
  const filePath = contactsFilePath.value;
  if (!filePath) {
    addLog("Please select a contacts file first.", "warning");
    return;
  }

  try {
    addLog(`Loading contacts from ${filePath}...`, "info");

    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    contacts = xlsx.utils.sheet_to_json(sheet);

    addLog(`Loaded ${contacts.length} contacts.`, "success");

    // Update contacts table
    updateContactsTable();

    // Enable sending if we have contacts and WhatsApp is connected
    startSendingBtn.disabled = !(
      contacts.length > 0 &&
      isClientReady &&
      imageFilePath.value &&
      pdfFilePath.value
    );
  } catch (error) {
    addLog(`Error loading contacts: ${error.message}`, "error");
  }
}

// Update contacts table
function updateContactsTable() {
  if (!contacts || contacts.length === 0) {
    contactsTableBody.innerHTML =
      '<tr><td colspan="3" class="text-center">No contacts loaded</td></tr>';
    contactCount.innerText = "0";
    return;
  }

  contactCount.innerText = contacts.length;
  contactsTableBody.innerHTML = "";

  contacts.slice(0, 20).forEach((contact, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${index + 1}</td>
            <td>${contact.Number}</td>
            <td><span class="badge bg-secondary">Pending</span></td>
        `;
    contactsTableBody.appendChild(row);
  });

  if (contacts.length > 20) {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td colspan="3" class="text-center">... and ${
              contacts.length - 20
            } more contacts</td>
        `;
    contactsTableBody.appendChild(row);
  }
}

// Select image file
async function selectImageFile() {
  const filePath = await ipcRenderer.invoke("select-image-file");
  if (filePath) {
    imageFilePath.value = filePath;
    ipcRenderer.invoke("save-settings", { lastImageFile: filePath });
    addLog(`Image file selected: ${filePath}`, "info");

    // Enable sending if we have contacts and WhatsApp is connected
    startSendingBtn.disabled = !(
      contacts.length > 0 &&
      isClientReady &&
      imageFilePath.value &&
      pdfFilePath.value
    );
  }
}

// Select PDF file
async function selectPdfFile() {
  const filePath = await ipcRenderer.invoke("select-pdf-file");
  if (filePath) {
    pdfFilePath.value = filePath;
    ipcRenderer.invoke("save-settings", { lastPdfFile: filePath });
    addLog(`PDF file selected: ${filePath}`, "info");

    // Enable sending if we have contacts and WhatsApp is connected
    startSendingBtn.disabled = !(
      contacts.length > 0 &&
      isClientReady &&
      imageFilePath.value &&
      pdfFilePath.value
    );
  }
}

// Start sending messages
async function startSendingMessages() {
  if (!isClientReady) {
    addLog("WhatsApp client is not ready. Please connect first.", "warning");
    return;
  }

  if (contacts.length === 0) {
    addLog("No contacts loaded. Please load contacts first.", "warning");
    return;
  }

  if (!imageFilePath.value || !pdfFilePath.value) {
    addLog("Please select both image and PDF files.", "warning");
    return;
  }

  if (!messageText.value) {
    addLog("Please enter a message.", "warning");
    return;
  }

  // Already sending?
  if (isSending && !isPaused) {
    addLog("Already sending messages.", "warning");
    return;
  }

  // If paused, resume
  if (isSending && isPaused) {
    isPaused = false;
    pauseResumeBtn.innerText = "Pause";
    addLog("Resumed sending messages.", "info");
    processNextContact();
    return;
  }

  // Verify files exist
  const imageExists = await ipcRenderer.invoke(
    "check-file-exists",
    imageFilePath.value
  );
  const pdfExists = await ipcRenderer.invoke(
    "check-file-exists",
    pdfFilePath.value
  );

  if (!imageExists) {
    addLog(`Image file not found: ${imageFilePath.value}`, "error");
    return;
  }

  if (!pdfExists) {
    addLog(`PDF file not found: ${pdfFilePath.value}`, "error");
    return;
  }

  // Start fresh
  isSending = true;
  isPaused = false;
  currentContactIndex = 0;

  // Update UI
  startSendingBtn.disabled = true;
  pauseResumeBtn.disabled = false;
  stopSendingBtn.disabled = false;
  pauseResumeBtn.innerText = "Pause";

  addLog("Starting to send messages...", "info");

  // Prepare media files
  try {
    addLog("Loading media files...", "info");

    imageMedia = MessageMedia.fromFilePath(imageFilePath.value);
    pdfMedia = MessageMedia.fromFilePath(pdfFilePath.value);

    addLog("Media files loaded successfully.", "success");

    // Log how many messages will be sent
    addLog(
      `Preparing to send messages to ${contacts.length} contacts.`,
      "info"
    );

    // Start processing contacts
    processNextContact();
  } catch (error) {
    addLog(`Error loading media files: ${error.message}`, "error");
    isSending = false;
    startSendingBtn.disabled = false;
    pauseResumeBtn.disabled = true;
    stopSendingBtn.disabled = true;
  }
}

// Process next contact
async function processNextContact() {
  if (!isSending || isPaused) {
    return;
  }

  if (currentContactIndex >= contacts.length) {
    // All contacts processed
    finishSending();
    return;
  }

  const contact = contacts[currentContactIndex];
  const number = contact.Number.toString().replace(/\\D/g, "");

  // Update progress
  const progress = Math.round((currentContactIndex / contacts.length) * 100);
  sendProgress.style.width = `${progress}%`;
  sendProgress.innerText = `${progress}%`;
  sendStatus.innerText = `Processing contact ${currentContactIndex + 1} of ${
    contacts.length
  }`;

  // Update contact status in table if visible
  if (currentContactIndex < 20) {
    const row = contactsTableBody.rows[currentContactIndex];
    if (row) {
      row.cells[2].innerHTML =
        '<span class="badge bg-primary">Processing</span>';
    }
  }

  addLog(`Processing contact: ${number}`, "info");

  try {
    // Ensure number has +91 country code
    let formattedNumber = number;
    if (!formattedNumber.startsWith("+91")) {
      formattedNumber = "+91" + formattedNumber;
    }

    let chatId = formattedNumber.replace("+", "") + "@c.us";

    // Check if number is on WhatsApp
    const isRegistered = await client.isRegisteredUser(chatId);
    if (!isRegistered) {
      addLog(`${formattedNumber} is NOT on WhatsApp. Skipping...`, "warning");

      // Update contact status in table if visible
      if (currentContactIndex < 20) {
        const row = contactsTableBody.rows[currentContactIndex];
        if (row) {
          row.cells[2].innerHTML =
            '<span class="badge bg-warning">Not on WhatsApp</span>';
        }
      }

      // Move to next contact
      currentContactIndex++;
      processNextContact();
      return;
    }

    // Send image with text caption
    await client.sendMessage(chatId, imageMedia, {
      caption: messageText.value,
    });
    addLog(`Image with text sent to ${formattedNumber}`, "success");

    // Delay before sending PDF
    const delay1 = Math.floor(
      Math.random() * (maxDelay.value * 1000 - minDelay.value * 1000) +
        minDelay.value * 1000
    );
    addLog(`Waiting ${delay1 / 1000} seconds before sending PDF...`, "info");

    await new Promise((resolve) => setTimeout(resolve, delay1));

    // Send PDF
    await client.sendMessage(chatId, pdfMedia, { caption: pdfCaption.value });
    addLog(`PDF sent to ${formattedNumber}`, "success");

    // Update contact status in table if visible
    if (currentContactIndex < 20) {
      const row = contactsTableBody.rows[currentContactIndex];
      if (row) {
        row.cells[2].innerHTML = '<span class="badge bg-success">Sent</span>';
      }
    }

    // Move to next contact
    currentContactIndex++;

    // Random delay before next contact
    const delay2 = Math.floor(
      Math.random() * (maxDelayPdf.value * 1000 - minDelayPdf.value * 1000) +
        minDelayPdf.value * 1000
    );
    addLog(`Waiting ${delay2 / 1000} seconds before next message...`, "info");

    setTimeout(processNextContact, delay2);
  } catch (error) {
    addLog(`Error sending to ${number}: ${error.message}`, "error");

    // Update contact status in table if visible
    if (currentContactIndex < 20) {
      const row = contactsTableBody.rows[currentContactIndex];
      if (row) {
        row.cells[2].innerHTML = '<span class="badge bg-danger">Failed</span>';
      }
    }

    // Move to next contact
    currentContactIndex++;

    // Continue with next after a delay
    setTimeout(processNextContact, 3000);
  }
}

// Finish sending
function finishSending() {
  isSending = false;
  isPaused = false;

  // Update UI
  sendProgress.style.width = "100%";
  sendProgress.innerText = "100%";
  sendStatus.innerText = "All messages sent!";
  startSendingBtn.disabled = false;
  pauseResumeBtn.disabled = true;
  stopSendingBtn.disabled = true;

  addLog("All messages sent successfully!", "success");
}

// Pause/Resume sending
function pauseResumeSending() {
  if (!isSending) {
    return;
  }

  isPaused = !isPaused;

  if (isPaused) {
    pauseResumeBtn.innerText = "Resume";
    sendStatus.innerText = `Paused (${currentContactIndex} of ${contacts.length})`;
    addLog("Message sending paused.", "warning");
  } else {
    pauseResumeBtn.innerText = "Pause";
    sendStatus.innerText = `Processing contact ${currentContactIndex + 1} of ${
      contacts.length
    }`;
    addLog("Resuming message sending...", "info");
    processNextContact();
  }
}

// Stop sending
function stopSending() {
  if (!isSending) {
    return;
  }

  isSending = false;
  isPaused = false;

  // Update UI
  sendStatus.innerText = `Stopped (${currentContactIndex} of ${contacts.length})`;
  startSendingBtn.disabled = false;
  pauseResumeBtn.disabled = true;
  stopSendingBtn.disabled = true;

  addLog("Message sending stopped.", "warning");
}

// Save settings
function saveSettings() {
  const settings = {
    minDelay: parseInt(minDelay.value, 10),
    maxDelay: parseInt(maxDelay.value, 10),
    minDelayPdf: parseInt(minDelayPdf.value, 10),
    maxDelayPdf: parseInt(maxDelayPdf.value, 10),
  };

  ipcRenderer.invoke("save-settings", settings);
  addLog("Settings saved successfully.", "success");
}

// Save template
function saveTemplate() {
  if (!messageText.value) {
    addLog("Please enter a message before saving as template.", "warning");
    return;
  }

  const template = {
    name: templateName.value || "Unnamed Template",
    content: messageText.value,
    date: new Date().toISOString(),
  };

  ipcRenderer.invoke("save-template", template);
  addLog("Template saved successfully.", "success");

  // Refresh templates
  loadTemplates();
}

// Load templates
async function loadTemplates() {
  const settings = await ipcRenderer.invoke("get-settings");
  const templates = settings.savedTemplates || [];

  if (templates.length === 0) {
    noTemplatesMessage.style.display = "block";
    templatesContainer.innerHTML = "";
    return;
  }

  noTemplatesMessage.style.display = "none";
  templatesContainer.innerHTML = "";

  templates.forEach((template, index) => {
    const templateElement = document.createElement("div");
    templateElement.className = "message-template";
    templateElement.innerHTML = `
            <div class="d-flex justify-content-between">
                <span class="template-title">${template.name}</span>
                <button class="btn-close btn-sm delete-template" data-index="${index}" aria-label="Delete"></button>
            </div>
            <div class="template-content">${template.content.substring(
              0,
              150
            )}${template.content.length > 150 ? "..." : ""}</div>
            <div class="text-muted small">${new Date(
              template.date
            ).toLocaleDateString()}</div>
        `;

    // Load template on click
    templateElement.addEventListener("click", (e) => {
      if (
        !e.target.classList.contains("delete-template") &&
        !e.target.classList.contains("btn-close")
      ) {
        messageText.value = template.content;
        templateName.value = template.name;
        previewMessage();
        addLog(`Template "${template.name}" loaded.`, "info");
      }
    });

    templatesContainer.appendChild(templateElement);
  });

  // Add delete handlers
  document.querySelectorAll(".delete-template").forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.stopPropagation();
      const index = parseInt(e.target.dataset.index, 10);
      await ipcRenderer.invoke("delete-template", index);
      addLog("Template deleted successfully.", "info");
      loadTemplates();
    });
  });
}

// Add log entry
function addLog(message, type = "info") {
  // Use our logger
  switch (type) {
    case "success":
      logger.info(message);
      break;
    case "error":
      logger.error(message);
      break;
    case "warning":
      logger.warn(message);
      break;
    default:
      logger.info(message);
      break;
  }

  const logEntry = document.createElement("div");
  logEntry.className = `log-entry log-${type}`;

  const timestamp = new Date().toLocaleTimeString();
  logEntry.innerHTML = `[${timestamp}] ${message}`;

  logContainer.appendChild(logEntry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Get application version
async function getAppVersion() {
  try {
    const version = await ipcRenderer.invoke("get-app-version");
    appVersion.textContent = version;
  } catch (error) {
    console.error("Failed to get app version:", error);
  }
}

// Export logs
async function exportLogs() {
  try {
    addLog("Exporting logs...", "info");
    const result = await ipcRenderer.invoke("export-logs");

    if (result.success) {
      addLog(`Logs exported successfully to: ${result.filePath}`, "success");
    } else {
      addLog("Failed to export logs.", "error");
    }
  } catch (error) {
    addLog(`Error exporting logs: ${error.message}`, "error");
  }
}

// Reset WhatsApp session
async function resetWhatsAppSession() {
  if (isClientInitialized) {
    addLog(
      "Cannot reset session while WhatsApp is connected. Please disconnect first.",
      "warning"
    );
    return;
  }

  const confirmReset = confirm(
    "This will delete your saved WhatsApp session and you'll need to scan the QR code again next time.\n\nAre you sure you want to continue?"
  );

  if (confirmReset) {
    try {
      addLog("Resetting WhatsApp session...", "info");
      const result = await ipcRenderer.invoke("reset-whatsapp-session");

      if (result.success) {
        addLog("WhatsApp session has been reset successfully.", "success");

        // Reset QR manager if available
        if (window.qrManager) {
          window.qrManager.resetQR();
          qrcodeContainer.innerHTML =
            '<p class="text-muted">Click Connect to scan QR code on next connection</p>';
        } else {
          qrcodeContainer.innerHTML =
            '<p class="text-muted">Click Connect to scan QR code on next connection</p>';
        }

        // Clear connection failures counter
        localStorage.setItem("whatsapp_connection_failures", "0");
      } else {
        addLog(`Failed to reset WhatsApp session: ${result.message}`, "error");
      }
    } catch (error) {
      addLog(`Error resetting WhatsApp session: ${error.message}`, "error");
    }
  }
}

// Check if WhatsApp session is corrupted
async function checkSessionHealth() {
  try {
    const sessionDir = await ipcRenderer.invoke("get-session-dir");
    const isSessionExists = await ipcRenderer.invoke("check-whatsapp-session");

    // If no session exists, no need to check health
    if (!isSessionExists) return true;

    // Check session integrity
    const integrityCheck = await ipcRenderer.invoke("check-session-integrity");

    if (!integrityCheck.valid) {
      addLog(
        `Session integrity check failed: ${integrityCheck.details.join(", ")}`,
        "warning"
      );

      if (integrityCheck.corrupted) {
        // If session is corrupted, prompt for reset
        const shouldReset = confirm(
          "WhatsApp session appears to be corrupted. " +
            "Would you like to reset your saved session? " +
            "You'll need to scan the QR code again, but this will fix connection problems.\n\n" +
            `Details: ${integrityCheck.details.join("\n")}`
        );

        if (shouldReset) {
          await ipcRenderer.invoke("reset-whatsapp-session");
          localStorage.setItem("whatsapp_connection_failures", "0");

          // Reset QR manager if available
          if (window.qrManager) {
            window.qrManager.resetQR();
          }

          addLog("Session reset successfully due to corruption", "info");
          return true;
        }

        return false;
      }
    }

    // Check if we've had repeated connection failures
    const storageKey = "whatsapp_connection_failures";
    const failCount = localStorage.getItem(storageKey) || 0;

    if (parseInt(failCount) >= 3) {
      // If multiple failures, suggest a session reset
      const shouldReset = confirm(
        "It seems there might be issues with your WhatsApp connection. " +
          "Would you like to reset your saved session? " +
          "You'll need to scan the QR code again, but this might fix the connection problems."
      );

      if (shouldReset) {
        await ipcRenderer.invoke("reset-whatsapp-session");
        localStorage.setItem(storageKey, "0");

        // Reset QR manager if available
        if (window.qrManager) {
          window.qrManager.resetQR();
        }

        addLog(
          "Session reset successfully due to persistent connection issues",
          "info"
        );
        return true;
      }
    }

    return true;
  } catch (error) {
    console.error("Session health check error:", error);
    return false;
  }
}

// Track connection failures
function trackConnectionFailure(isFailure) {
  const storageKey = "whatsapp_connection_failures";
  let failCount = parseInt(localStorage.getItem(storageKey) || "0");

  if (isFailure) {
    // Increment failure count
    failCount++;
    localStorage.setItem(storageKey, failCount.toString());
  } else {
    // Successful connection, reset counter
    localStorage.setItem(storageKey, "0");
  }

  return failCount;
}

// Custom error handler for renderer process
window.addEventListener("error", function (event) {
  console.error("Unhandled error:", event.error);

  // Add to log with full error details
  if (typeof addLog === "function") {
    addLog(
      `Unhandled error: ${event.error ? event.error.message : "Unknown error"}`,
      "error"
    );

    // Display error in UI if possible
    try {
      const errorContainer = document.createElement("div");
      errorContainer.className = "alert alert-danger mt-3";
      errorContainer.innerHTML = `
        <h5><i class="bi bi-exclamation-triangle"></i> Application Error</h5>
        <p>${event.error ? event.error.message : "Unknown error occurred"}</p>
        <p class="small">Please try resetting the session from Settings tab, then restart the application.</p>
      `;

      // Insert at top of body or in a specific container
      const targetContainer =
        document.getElementById("logContainer") || document.body;
      targetContainer.prepend(errorContainer);
    } catch (displayError) {
      console.error("Failed to show error in UI:", displayError);
    }
  }
});

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  getAppVersion();
});
connectBtn.addEventListener("click", connectWhatsApp);
disconnectBtn.addEventListener("click", disconnectWhatsApp);
messageText.addEventListener("input", previewMessage);
previewBtn.addEventListener("click", previewMessage);
selectImageBtn.addEventListener("click", selectImageFile);
selectPdfBtn.addEventListener("click", selectPdfFile);
selectContactsBtn.addEventListener("click", selectContactsFile);
loadContactsBtn.addEventListener("click", loadContactsFromFile);
startSendingBtn.addEventListener("click", startSendingMessages);
pauseResumeBtn.addEventListener("click", pauseResumeSending);
stopSendingBtn.addEventListener("click", stopSending);
saveSettingsBtn.addEventListener("click", saveSettings);
saveTemplateBtn.addEventListener("click", saveTemplate);
refreshTemplatesBtn.addEventListener("click", loadTemplates);
exportLogsBtn.addEventListener("click", exportLogs);
resetSessionBtn.addEventListener("click", resetWhatsAppSession);
