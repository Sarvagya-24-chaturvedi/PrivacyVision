import { CapturedContext, CaptureContextResponse, RunAgentResponse } from "../shared/messages";
import { BenchmarkRunner } from "../benchmark/benchmark-runner";

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const tabButtons = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
  const tabContents = document.querySelectorAll<HTMLElement>(".tab-content");

  const statDetected = document.getElementById("stat-detected")!;
  const statRedacted = document.getElementById("stat-redacted")!;
  const statFaces = document.getElementById("stat-faces")!;
  const statFirewall = document.getElementById("stat-firewall")!;
  const privacyScore = document.getElementById("privacy-score")!;
  const serverStatus = document.getElementById("server-status")!;
  const serverDot = document.getElementById("server-dot")!;

  const btnCapture = document.getElementById("btn-capture") as HTMLButtonElement;
  const btnRunAgent = document.getElementById("btn-run-agent") as HTMLButtonElement;
  const btnOverlay = document.getElementById("btn-overlay") as HTMLButtonElement;
  const btnPrivacyScan = document.getElementById("btn-privacy-scan") as HTMLButtonElement;
  const btnClearLog = document.getElementById("btn-clear-log") as HTMLButtonElement;
  const btnRunBenchmark = document.getElementById("btn-run-benchmark") as HTMLButtonElement;

  const taskInput = document.getElementById("task-input") as HTMLInputElement;
  const logBox = document.getElementById("log-box")!;

  const imgOriginal = document.getElementById("img-original") as HTMLImageElement;
  const imgSanitized = document.getElementById("img-sanitized") as HTMLImageElement;
  const emptyOriginal = document.getElementById("empty-original")!;
  const emptySanitized = document.getElementById("empty-sanitized")!;
  const payloadPreview = document.getElementById("payload-preview")!;

  // Tab switching
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      const targetTab = btn.getAttribute("data-tab");
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) targetContent.classList.add("active");
    });
  });

  function addLog(message: string, type: "info" | "success" | "warning" | "danger" = "info") {
    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;
    const time = new Date().toLocaleTimeString();
    entry.innerText = `[${time}] ${message}`;
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight;
  }

  btnClearLog.addEventListener("click", () => {
    logBox.innerHTML = "";
    addLog("Logs cleared.", "info");
  });

  const inputServerUrl = document.getElementById("input-server-url") as HTMLInputElement;
  const btnSaveEndpoint = document.getElementById("btn-save-endpoint") as HTMLButtonElement;

  // Check system status
  function checkStatus() {
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      // Check lastError immediately to prevent Chrome logging "Unchecked runtime.lastError"
      if (chrome.runtime.lastError) {
        serverStatus.innerText = "Offline (Demo Mode)";
        serverStatus.className = "text-warning";
        serverDot.className = "dot dot-offline";
        return;
      }
      if (response?.serverUrl && inputServerUrl) {
        inputServerUrl.value = response.serverUrl;
      }
      if (response?.serverConnected) {
        serverStatus.innerText = "Connected";
        serverStatus.className = "text-success";
        serverDot.className = "dot dot-active";
      } else {
        serverStatus.innerText = "Offline (Demo Mode)";
        serverStatus.className = "text-warning";
        serverDot.className = "dot dot-offline";
      }
    });
  }
  checkStatus();

  // Save custom or cloud server URL
  btnSaveEndpoint?.addEventListener("click", () => {
    const newUrl = inputServerUrl.value.trim();
    if (!newUrl) {
      addLog("Please enter a backend URL (e.g. http://localhost:8000)", "warning");
      return;
    }
    if (!/^https?:\/\//i.test(newUrl)) {
      addLog("URL must start with http:// or https:// (e.g. http://localhost:8000)", "warning");
      return;
    }
    btnSaveEndpoint.disabled = true;
    chrome.runtime.sendMessage({ type: "SET_SERVER_URL", url: newUrl }, (res) => {
      btnSaveEndpoint.disabled = false;
      const lastErr = chrome.runtime.lastError?.message;
      if (lastErr) {
        addLog(`Could not contact extension background: ${lastErr}. Reload extension at chrome://extensions.`, "danger");
        return;
      }
      if (res?.ok) {
        if (res.reachable) {
          addLog(`✓ Connected to backend endpoint: ${res.serverUrl}`, "success");
        } else {
          addLog(`Endpoint saved as ${res.serverUrl}, but /health is currently unreachable.`, "warning");
        }
        checkStatus();
      } else {
        addLog(`Failed to update endpoint: ${res?.error || "Unknown error"}`, "danger");
      }
    });
  });

  // Update UI with captured context
  function updateContextUI(context: CapturedContext) {
    const detections = context.detections || [];
    const faces = detections.filter((d) => d.type === "FACE").length;
    const pii = detections.length;

    statDetected.innerText = String(pii);
    statRedacted.innerText = String(pii);
    statFaces.innerText = String(faces);

    // Live privacy protection score calculation
    const score = pii === 0 ? 100 : Math.min(100, Math.round((pii / (pii || 1)) * 100));
    privacyScore.innerText = `${score}%`;

    // Firewall status
    if (context.firewallPassed) {
      statFirewall.innerText = "✓ SAFE";
      statFirewall.className = "metric-num text-success";
    } else {
      statFirewall.innerText = "BLOCKED";
      statFirewall.className = "metric-num text-danger";
    }

    // Update images in Before / After tab
    if (context.originalDataUrl) {
      imgOriginal.src = context.originalDataUrl;
      imgOriginal.style.display = "block";
      emptyOriginal.style.display = "none";
    }
    if (context.sanitizedDataUrl) {
      imgSanitized.src = context.sanitizedDataUrl;
      imgSanitized.style.display = "block";
      emptySanitized.style.display = "none";
    }

    // Update payload preview
    payloadPreview.innerText = JSON.stringify(
      {
        task: taskInput.value,
        sanitizedScreenshot: "<BASE64_SANITIZED_PNG_DATA>",
        domNodesCount: context.dom.nodes.length,
        redactionsApplied: context.detections.length,
        firewallStatus: context.firewallPassed ? "PASSED_VERIFIED" : "BLOCKED"
      },
      null,
      2
    );
  }

  // Action: Capture Context
  btnCapture.addEventListener("click", () => {
    addLog("Capturing tab context & running local privacy engine...", "info");
    btnCapture.disabled = true;

    chrome.runtime.sendMessage({ type: "CAPTURE_CONTEXT" }, (res: CaptureContextResponse) => {
      btnCapture.disabled = false;
      const err = chrome.runtime.lastError?.message;
      if (err) {
        addLog(`Capture failed: ${err}. Please refresh the webpage and try again.`, "danger");
        return;
      }

      if (res?.ok && res.context) {
        updateContextUI(res.context);
        addLog(
          `Local scan complete. ${res.context.detections.length} sensitive regions detected & redacted.`,
          "success"
        );
        addLog(`Offscreen canvas redaction took ${res.context.timings.redactionMs}ms.`, "info");
      } else {
        addLog(`Capture failed: ${res?.error || "Unknown error"}`, "danger");
      }
    });
  });

  // Action: Toggle Overlay
  btnOverlay.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY" }, (res) => {
        const err = chrome.runtime.lastError?.message;
        if (err) {
          addLog(`Overlay inactive on this tab: ${err}`, "warning");
          return;
        }
        if (res?.visible) {
          addLog("Privacy inspection overlay enabled on active page.", "info");
        } else {
          addLog("Privacy inspection overlay disabled.", "info");
        }
      });
    });
  });

  // Action: Privacy Scan
  btnPrivacyScan.addEventListener("click", () => {
    addLog("Scanning active webpage for PII, credentials, and Indian IDs...", "info");
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return;
      chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_DOM" }, (res) => {
        const err = chrome.runtime.lastError?.message;
        if (err) {
          addLog(`Scan unavailable: ${err}. Refresh the webpage first.`, "warning");
          return;
        }
        if (res?.ok && res.detections) {
          const count = res.detections.length;
          addLog(`Privacy scan found ${count} sensitive items.`, count > 0 ? "warning" : "success");
          res.detections.forEach((d: any) => {
            addLog(`Detected: ${d.type} (${Math.round(d.confidence * 100)}%) via [${d.sources.join(", ")}]`, "info");
          });
        } else {
          addLog(`Privacy scan error: ${res?.error || "Failed"}`, "danger");
        }
      });
    });
  });

  // Action: Run Agent
  btnRunAgent.addEventListener("click", () => {
    const task = taskInput.value.trim();
    if (!task) {
      addLog("Please enter a task description.", "warning");
      return;
    }

    addLog(`Initiating Agent for task: "${task}"`, "info");
    btnRunAgent.disabled = true;

    chrome.runtime.sendMessage({ type: "RUN_AGENT", task }, (res: RunAgentResponse) => {
      btnRunAgent.disabled = false;
      const err = chrome.runtime.lastError?.message;
      if (err) {
        addLog(`Agent execution error: ${err}`, "danger");
        return;
      }

      if (res?.ok) {
        if (res.capturedContext) {
          updateContextUI(res.capturedContext);
        }
        addLog(`Server VLM generated action: ${res.action?.action}`, "success");
        if (res.executionResult) {
          addLog(
            `Client Execution: ${res.executionResult.message} (${res.executionResult.executionTimeMs}ms)`,
            res.executionResult.success ? "success" : "danger"
          );
        }
      } else {
        addLog(`Agent execution error: ${res?.error || "Failed"}`, "danger");
      }
    });
  });

  // Action: Run Benchmark
  btnRunBenchmark.addEventListener("click", async () => {
    addLog("Executing evaluation benchmark suite...", "info");
    btnRunBenchmark.disabled = true;

    try {
      const results = await BenchmarkRunner.runSuite("login");
      btnRunBenchmark.disabled = false;

      document.getElementById("metric-accuracy")!.innerText = `${results.visualAccuracyScore}%`;
      document.getElementById("metric-pr")!.innerText = `P: ${results.precision} / R: ${results.recall}`;
      document.getElementById("metric-iou")!.innerText = `IoU: ${results.averageIoU}`;
      if (results.memoryUsageMb) {
        document.getElementById("metric-memory")!.innerText = `${results.memoryUsageMb} MB`;
      }

      const row = document.getElementById("latency-row")!;
      row.innerHTML = `
        <td>${results.timings.captureMs}ms</td>
        <td>${results.timings.domMs}ms</td>
        <td>${results.timings.privacyMs}ms</td>
        <td>${results.timings.redactionMs}ms</td>
        <td>${results.timings.networkMs}ms</td>
        <td>${results.timings.vlmMs}ms</td>
        <td><strong>${results.timings.totalMs}ms</strong></td>
      `;

      addLog(`Benchmark completed: F1=${results.f1Score}, IoU=${results.averageIoU}`, "success");
    } catch (err: any) {
      btnRunBenchmark.disabled = false;
      addLog(`Benchmark run failed: ${err.message}`, "danger");
    }
  });
});
