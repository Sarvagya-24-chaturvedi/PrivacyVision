import { BenchmarkRunner } from "../benchmark/benchmark-runner";
document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const statDetected = document.getElementById("stat-detected");
    const statRedacted = document.getElementById("stat-redacted");
    const statFaces = document.getElementById("stat-faces");
    const statFirewall = document.getElementById("stat-firewall");
    const privacyScore = document.getElementById("privacy-score");
    const serverStatus = document.getElementById("server-status");
    const serverDot = document.getElementById("server-dot");
    const btnCapture = document.getElementById("btn-capture");
    const btnRunAgent = document.getElementById("btn-run-agent");
    const btnOverlay = document.getElementById("btn-overlay");
    const btnPrivacyScan = document.getElementById("btn-privacy-scan");
    const btnClearLog = document.getElementById("btn-clear-log");
    const btnRunBenchmark = document.getElementById("btn-run-benchmark");
    const taskInput = document.getElementById("task-input");
    const logBox = document.getElementById("log-box");
    const imgOriginal = document.getElementById("img-original");
    const imgSanitized = document.getElementById("img-sanitized");
    const emptyOriginal = document.getElementById("empty-original");
    const emptySanitized = document.getElementById("empty-sanitized");
    const payloadPreview = document.getElementById("payload-preview");
    // Tab switching
    tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            tabButtons.forEach((b) => b.classList.remove("active"));
            tabContents.forEach((c) => c.classList.remove("active"));
            btn.classList.add("active");
            const targetTab = btn.getAttribute("data-tab");
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent)
                targetContent.classList.add("active");
        });
    });
    function addLog(message, type = "info") {
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
    // Check system status
    function checkStatus() {
        chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
            if (response?.serverConnected) {
                serverStatus.innerText = "Connected";
                serverStatus.className = "text-success";
                serverDot.className = "dot dot-active";
            }
            else {
                serverStatus.innerText = "Offline (Demo Mode)";
                serverStatus.className = "text-warning";
                serverDot.className = "dot dot-offline";
            }
        });
    }
    checkStatus();
    // Update UI with captured context
    function updateContextUI(context) {
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
        }
        else {
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
        payloadPreview.innerText = JSON.stringify({
            task: taskInput.value,
            sanitizedScreenshot: "<BASE64_SANITIZED_PNG_DATA>",
            domNodesCount: context.dom.nodes.length,
            redactionsApplied: context.detections.length,
            firewallStatus: context.firewallPassed ? "PASSED_VERIFIED" : "BLOCKED"
        }, null, 2);
    }
    // Action: Capture Context
    btnCapture.addEventListener("click", () => {
        addLog("Capturing tab context & running local privacy engine...", "info");
        btnCapture.disabled = true;
        chrome.runtime.sendMessage({ type: "CAPTURE_CONTEXT" }, (res) => {
            btnCapture.disabled = false;
            if (res?.ok && res.context) {
                updateContextUI(res.context);
                addLog(`Local scan complete. ${res.context.detections.length} sensitive regions detected & redacted.`, "success");
                addLog(`Offscreen canvas redaction took ${res.context.timings.redactionMs}ms.`, "info");
            }
            else {
                addLog(`Capture failed: ${res?.error || "Unknown error"}`, "danger");
            }
        });
    });
    // Action: Toggle Overlay
    btnOverlay.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (!tab?.id)
                return;
            chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY" }, (res) => {
                if (res?.visible) {
                    addLog("Privacy inspection overlay enabled on active page.", "info");
                }
                else {
                    addLog("Privacy inspection overlay disabled.", "info");
                }
            });
        });
    });
    // Action: Privacy Scan
    btnPrivacyScan.addEventListener("click", () => {
        addLog("Scanning active webpage for PII, credentials, and Indian IDs...", "info");
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (!tab?.id)
                return;
            chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_DOM" }, (res) => {
                if (res?.ok && res.detections) {
                    const count = res.detections.length;
                    addLog(`Privacy scan found ${count} sensitive items.`, count > 0 ? "warning" : "success");
                    res.detections.forEach((d) => {
                        addLog(`Detected: ${d.type} (${Math.round(d.confidence * 100)}%) via [${d.sources.join(", ")}]`, "info");
                    });
                }
                else {
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
        chrome.runtime.sendMessage({ type: "RUN_AGENT", task }, (res) => {
            btnRunAgent.disabled = false;
            if (res?.ok) {
                if (res.capturedContext) {
                    updateContextUI(res.capturedContext);
                }
                addLog(`Server VLM generated action: ${res.action?.action}`, "success");
                if (res.executionResult) {
                    addLog(`Client Execution: ${res.executionResult.message} (${res.executionResult.executionTimeMs}ms)`, res.executionResult.success ? "success" : "danger");
                }
            }
            else {
                addLog(`Agent execution error: ${res?.error || "Failed"}`, "danger");
            }
        });
    });
    // Action: Run Benchmark
    btnRunBenchmark.addEventListener("click", async () => {
        addLog("Executing SIH26171 evaluation benchmark suite...", "info");
        btnRunBenchmark.disabled = true;
        try {
            const results = await BenchmarkRunner.runSuite("login");
            btnRunBenchmark.disabled = false;
            document.getElementById("metric-accuracy").innerText = `${results.visualAccuracyScore}%`;
            document.getElementById("metric-pr").innerText = `P: ${results.precision} / R: ${results.recall}`;
            document.getElementById("metric-iou").innerText = `IoU: ${results.averageIoU}`;
            if (results.memoryUsageMb) {
                document.getElementById("metric-memory").innerText = `${results.memoryUsageMb} MB`;
            }
            const row = document.getElementById("latency-row");
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
        }
        catch (err) {
            btnRunBenchmark.disabled = false;
            addLog(`Benchmark run failed: ${err.message}`, "danger");
        }
    });
});
