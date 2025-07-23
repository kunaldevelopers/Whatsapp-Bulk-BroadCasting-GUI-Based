/**
 * Process Cleaner Utility
 *
 * This script helps detect and clean up orphaned Chromium processes that
 * might be interfering with WhatsApp Web's connection.
 */

console.log("Process cleaner loading...");

document.addEventListener("DOMContentLoaded", function () {
  // Add a utility button to check and clean processes
  const resetSessionBtn = document.getElementById("resetSessionBtn");
  if (resetSessionBtn && resetSessionBtn.parentNode) {
    const cleanProcessesBtn = document.createElement("button");
    cleanProcessesBtn.id = "cleanProcessesBtn";
    cleanProcessesBtn.className = "btn btn-outline-warning";
    cleanProcessesBtn.setAttribute("data-bs-toggle", "tooltip");
    cleanProcessesBtn.setAttribute(
      "title",
      "Clean up any background browser processes that might be causing connection issues"
    );
    cleanProcessesBtn.innerHTML =
      '<i class="bi bi-x-octagon"></i> Clean Processes';

    cleanProcessesBtn.addEventListener("click", cleanChromiumProcesses);

    resetSessionBtn.parentNode.insertBefore(cleanProcessesBtn, resetSessionBtn);
  }

  // Initialize tooltips
  if (typeof bootstrap !== "undefined" && bootstrap.Tooltip) {
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach((tooltip) => new bootstrap.Tooltip(tooltip));
  }

  console.log("Process cleaner initialized");
});

/**
 * Clean up any Chromium processes that might be interfering with WhatsApp
 */
async function cleanChromiumProcesses() {
  if (typeof window.addLog !== "function") {
    console.error("addLog function not available");
    return;
  }

  window.addLog("Checking for orphaned browser processes...", "info");

  try {
    // Use the globally available ipcRenderer from renderer.js
    const result = await window.ipcRenderer.invoke("clean-chromium-processes");

    if (result.success) {
      window.addLog(`Process cleanup completed: ${result.message}`, "success");

      if (result.processesKilled && result.processesKilled > 0) {
        window.addLog(
          `Cleared ${result.processesKilled} orphaned browser processes`,
          "success"
        );

        // Show confirmation
        const confirmRestart = confirm(
          `Successfully cleared ${result.processesKilled} processes that might have been interfering with WhatsApp connection.\n\nIt's recommended to restart the application now. Would you like to restart?`
        );

        if (confirmRestart) {
          await window.ipcRenderer.invoke("restart-app");
        }
      } else {
        window.addLog("No orphaned browser processes found", "info");
      }
    } else {
      window.addLog(`Process cleanup failed: ${result.message}`, "error");
    }
  } catch (error) {
    console.error("Error cleaning processes:", error);
    window.addLog(`Error cleaning processes: ${error.message}`, "error");
  }
}
