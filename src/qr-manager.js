/**
 * QR Code Manager - Enhanced QR Code management for WhatsApp Web
 *
 * This script manages QR code generation, refresh, and timeouts
 * to ensure proper connection to WhatsApp Web.
 */

console.log("QR Manager loading...");

class QRCodeManager {
  constructor() {
    this.qrContainer = null;
    this.connectionStatus = null;
    this.qrRetryCount = 0;
    this.maxQrRetries = 5;
    this.qrRefreshInterval = null;
    this.qrTimeout = null;
    this.currentQR = null;
    this.status = "idle";
  }

  initialize() {
    this.qrContainer = document.getElementById("qrcode");
    this.connectionStatus = document.getElementById("connectionStatus");

    console.log("QR Manager initialized");

    // Add visual debug indicator
    const debugIndicator = document.createElement("div");
    debugIndicator.className =
      "position-fixed bottom-0 end-0 p-2 m-2 bg-dark text-white small rounded";
    debugIndicator.style.zIndex = "9999";
    debugIndicator.style.opacity = "0.8";
    debugIndicator.style.cursor = "pointer";
    debugIndicator.innerHTML =
      "QR Active <span class='badge bg-success ms-1'>✓</span>";
    debugIndicator.addEventListener("click", () => {
      console.log("QR Manager status:", this.status);
      console.log("Current QR:", this.currentQR ? "Available" : "None");
      console.log("QR Retry count:", this.qrRetryCount);
    });
    document.body.appendChild(debugIndicator);

    return this;
  }

  showQRCode(qrData) {
    if (!this.qrContainer) return;

    this.currentQR = qrData;
    this.status = "qr-displayed";
    this.qrRetryCount++;

    console.log(`QR Code received (try #${this.qrRetryCount})`);

    // Handle QR timeout - WhatsApp QR codes expire after ~60 seconds
    clearTimeout(this.qrTimeout);
    this.qrTimeout = setTimeout(() => {
      if (this.status === "qr-displayed") {
        console.log("QR Code timeout - should refresh soon");
        this.showQRExpiring();
      }
    }, 45000); // 45 seconds - warn before it expires

    // Update UI with the QR code
    if (typeof QRCode !== "undefined") {
      QRCode.toDataURL(qrData, { width: 300 }, (err, url) => {
        if (err) {
          console.error("Error generating QR code:", err);
          this.showError("Failed to generate QR code: " + err.message);
          return;
        }

        // Display QR with explanatory text
        this.qrContainer.innerHTML = `
          <div class="text-center">
            <p class="text-success mb-2">QR code ready to scan! (${this.qrRetryCount}/${this.maxQrRetries})</p>
            <div class="mb-2 position-relative">
              <img src="${url}" alt="QR Code" class="mb-2 border p-2 bg-white">
              <div class="position-absolute top-0 end-0 m-2">
                <span class="badge bg-success animate-pulse">Active</span>
              </div>
            </div>
            <p class="text-muted small">Scan this with your WhatsApp mobile app</p>
            <p class="text-muted small">QR code refreshes automatically if not scanned</p>
          </div>
        `;

        // Create a progress bar to show QR expiration time
        const progressContainer = document.createElement("div");
        progressContainer.className = "progress mt-2";
        progressContainer.style.height = "5px";

        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar progress-bar-striped bg-info";
        progressBar.style.width = "100%";
        progressContainer.appendChild(progressBar);
        this.qrContainer
          .querySelector(".text-center")
          .appendChild(progressContainer);

        // Animate the progress bar to show the 60 second expiration
        let timeLeft = 60;
        const interval = setInterval(() => {
          timeLeft--;
          const percentage = (timeLeft / 60) * 100;
          progressBar.style.width = `${percentage}%`;

          if (timeLeft <= 15) {
            progressBar.className =
              "progress-bar progress-bar-striped bg-warning";
          }

          if (timeLeft <= 0 || this.status !== "qr-displayed") {
            clearInterval(interval);
          }
        }, 1000);
      });
    } else {
      console.error("QRCode library not found");
      this.qrContainer.innerHTML = `
        <div class="alert alert-danger">
          QR Code library not found. Cannot display QR code.
        </div>
      `;
    }

    // Update UI if max retries reached
    if (this.qrRetryCount >= this.maxQrRetries) {
      console.log("Max QR code retries reached");
      this.showMaxRetriesError();
    }
  }

  showQRExpiring() {
    if (!this.qrContainer) return;

    const qrImage = this.qrContainer.querySelector("img");
    if (qrImage) {
      // Add visual indication that QR is expiring
      qrImage.style.opacity = "0.6";

      const overlay = document.createElement("div");
      overlay.className =
        "position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center";
      overlay.innerHTML = `
        <div class="badge bg-warning p-2">
          <i class="bi bi-clock-history"></i> Expiring soon...
        </div>
      `;

      const container = qrImage.parentElement;
      if (container && container.style.position !== "relative") {
        container.style.position = "relative";
      }
      if (container) container.appendChild(overlay);
    }
  }

  showGenerating() {
    if (!this.qrContainer) return;

    this.status = "generating";
    this.qrContainer.innerHTML = `
      <div class="text-center">
        <div class="spinner-border text-primary mb-3" role="status">
          <span class="visually-hidden">Generating...</span>
        </div>
        <p class="text-info">
          <i class="bi bi-qr-code"></i> Generating new QR code...
        </p>
        <p class="small text-muted">Please wait a moment</p>
      </div>
    `;
  }

  showScanning() {
    if (!this.qrContainer) return;

    this.status = "scanning";
    clearTimeout(this.qrTimeout);

    this.qrContainer.innerHTML = `
      <div class="text-center">
        <div class="spinner-border text-success mb-3" role="status">
          <span class="visually-hidden">Connecting...</span>
        </div>
        <p class="text-info">
          <i class="bi bi-phone"></i> QR Code scanned!
        </p>
        <p class="small text-muted">Finalizing connection...</p>
      </div>
    `;
  }

  showConnected() {
    if (!this.qrContainer) return;

    this.status = "connected";
    clearTimeout(this.qrTimeout);
    clearInterval(this.qrRefreshInterval);

    this.qrContainer.innerHTML = `
      <div class="text-center">
        <div class="mb-3 text-success">
          <i class="bi bi-check-circle-fill" style="font-size: 3rem;"></i>
        </div>
        <p class="text-success fw-bold">Connected to WhatsApp!</p>
        <p class="small text-muted">Your session has been saved for future use</p>
      </div>
    `;

    // Update connection status
    if (this.connectionStatus) {
      this.connectionStatus.innerHTML =
        '<span class="status-indicator status-connected"></span> Connected';
    }
  }

  showError(message) {
    if (!this.qrContainer) return;

    this.status = "error";
    clearTimeout(this.qrTimeout);

    this.qrContainer.innerHTML = `
      <div class="text-center">
        <div class="mb-3 text-danger">
          <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem;"></i>
        </div>
        <p class="text-danger">Connection Error</p>
        <p>${message}</p>
        <div class="mt-3">
          <button class="btn btn-outline-danger btn-sm me-2" onclick="resetWhatsAppSession()">
            Reset Session
          </button>
          <button class="btn btn-primary btn-sm" onclick="location.reload()">
            Reload App
          </button>
        </div>
      </div>
    `;
  }

  showMaxRetriesError() {
    clearInterval(this.qrRefreshInterval);

    // Add error message under the QR code
    const errorMsg = document.createElement("div");
    errorMsg.className = "alert alert-warning mt-3";
    errorMsg.innerHTML = `
      <strong>Warning:</strong> QR code has been refreshed ${this.qrRetryCount} times.
      <div class="mt-2">
        <button class="btn btn-sm btn-warning me-2" onclick="resetWhatsAppSession()">
          Reset Session
        </button>
        <button class="btn btn-sm btn-outline-secondary" onclick="location.reload()">
          Reload App
        </button>
      </div>
    `;

    if (this.qrContainer && !this.qrContainer.querySelector(".alert-warning")) {
      this.qrContainer.appendChild(errorMsg);
    }
  }

  resetQR() {
    this.qrRetryCount = 0;
    this.status = "idle";
    clearTimeout(this.qrTimeout);
    clearInterval(this.qrRefreshInterval);
    this.currentQR = null;

    console.log("QR state reset");
  }
}

// Initialize and export globally
window.qrManager = new QRCodeManager();

// Setup on document ready
document.addEventListener("DOMContentLoaded", () => {
  window.qrManager.initialize();

  // Add animation styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.6; }
      100% { opacity: 1; }
    }
    .animate-pulse {
      animation: pulse 2s infinite;
    }
  `;
  document.head.appendChild(style);

  console.log("QR Manager setup complete");
});
