let floatingUI = null;
let currentPageUrl = null;
let modelSession = null;
let vocab = null;

async function loadVocab() {
  if (!vocab) {
    const vocabPath = chrome.runtime.getURL("vocab.json");
    const response = await fetch(vocabPath);
    vocab = await response.json();
  }
}

function tokenize(text, maxLen = 100) {
  const oovTokenId = vocab["<OOV>"] || 1;
  const words = text.toLowerCase().split(/\s+/);

  const tokenIds = words.map((word) => {
    let id = vocab[word] ?? oovTokenId;
    return Math.max(-10000, Math.min(9999, id)); // ✅ safe clamp
  });

  const padded = new Int32Array(maxLen).fill(0);
  tokenIds.slice(0, maxLen).forEach((id, i) => (padded[i] = id));
  return padded;
}

async function loadModel() {
  if (!modelSession) {
    try {
      // ✅ Force it to use non-threaded, non-JSEP backend
      ort.env.wasm.wasmPaths = {
        "ort-wasm.wasm": chrome.runtime.getURL("ort-backend/ort-wasm.wasm"),
        "ort-wasm-simd.wasm": chrome.runtime.getURL(
          "ort-backend/ort-wasm-simd.wasm"
        ),
      };

      ort.env.wasm.simd = true;

      // ❌ Do NOT set ort.env.wasm.numThreads
      // ❌ Do NOT include ort-wasm-simd-threaded.* or jsep files anywhere

      const modelOptions = {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
        executionMode: "sequential", // Not parallel, to avoid threading paths
      };

      const modelPath = chrome.runtime.getURL("model.onnx");
      modelSession = await ort.InferenceSession.create(modelPath, modelOptions);
    } catch (error) {
      throw error;
    }
  }
}

// Preprocess helpers
function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());
}

function preprocess(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Run ONNX model on input text
async function runLocalModel(text) {
  await loadModel();
  await loadVocab();

  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return 0;

  let total = 0;
  let validCount = 0;
  for (const sentence of sentences) {
    try {
      const tokenIds = tokenize(sentence);

      // Use Int32Array since we're working with token IDs
      const inputData = Float32Array.from(tokenIds);
      const inputTensor = new ort.Tensor("float32", inputData, [1, 100]);
      const feeds = { input: inputTensor };

      const results = await modelSession.run(feeds);
      const output = results[Object.keys(results)[0]];
      const scores = Array.from(output.data);
      validCount++;
      total += scores[0] || 0; // Instruction class confidence
    } catch (err) {}
  }
  return validCount > 0 ? total / validCount : 0;
}

function createFloatingUI(pageTitle, autoExtract = false) {
  // In createFloatingUI:

  const url = window.location.href;
  if (floatingUI && currentPageUrl === url) return floatingUI;

  if (floatingUI?.parentElement) {
    floatingUI.parentElement.removeChild(floatingUI);
    floatingUI = null;
  }

  currentPageUrl = url;
  floatingUI = document.createElement("div");
  floatingUI.id = "instructions-floating-ui";
  floatingUI.style.zIndex = "2147483647";

  const shadow = floatingUI.attachShadow({ mode: "open" });

  // ✅ Inject Tailwind CSS
  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("dist/styles.css");
  shadow.appendChild(styleLink);

  const container = document.createElement("div");
  container.innerHTML = `
 <div id="floating-container" style="position: fixed; top: 40px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 56rem; background-color: white; padding: 0; border-radius: 0.75rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #eaeaea; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; z-index: 2147483647; max-height: 80vh; overflow-y: auto;">
      <div class="header-section" style="background-color: #f0f7ff; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem;">
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
  <h2 style="font-size: 1.25rem; font-weight: 600; margin: 0; color: black;">Just the Instructions</h2>
  <div style="display: flex; gap: 0.25rem; align-items: center;">
  <div style="position: relative; display: flex; align-items: center;">
    <button id="settings-btn"
      style="font-size: 1.25rem; background: none; border: none; cursor: pointer; color: #666; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      ⚙️
    </button>
  <div id="settings-menu" style="
    position: absolute;
    top: 2.75rem;
    right: 0.5rem;
    display: none;
    background: white;
    border: 1px solid #c0d9f8;
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    padding: 1.25rem 1rem;
    border-radius: 0.5rem;
    z-index: 2147483648;
    font-size: 0.875rem;
    font-weight: 500;
    min-width: 220px;
  ">

<div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
  <span style="font-size: 0.875rem;">Enable Notifications</span>
<label style="
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
">
  <input type="checkbox" id="notify-toggle" style="opacity: 0; width: 0; height: 0;" />
  <span style="
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 34px;
  "></span>
  <span style="
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 4px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  " id="notify-slider-circle"></span>
</label>

</div>

</div>
</div>
    
    <button id="close-btn" style="font-size: 1.75rem; background: none; border: none; cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center;">&times;</button>
  </div>
</div>


  <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #4b5563;">
    <span style="color: #6b7280;">Analyzing:</span>
    <strong style="color: #111827;">${pageTitle}</strong>
  </div>

  <div id="average-score" style="margin-top: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #2563eb;">
    <!-- Score + Show reasoning toggle populated later -->
  </div>

  ${
    autoExtract
      ? ""
      : `
  <div id="gpt-action-container" style="margin-top: 0px; margin-bottom: 0px; padding: 0 1.5rem; display: flex; justify-content: center;">
    <div id="gpt-action-wrapper" style="display: flex; justify-content: center;">
      <button id="generate-with-gpt" style="
      margin-top: 10px;
        background-color: #3B82F6;
        color: white;
        padding: 12px 20px;
    border-radius: 6px;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  ">
    ✨ Extract Instructions  </button>
  <div id="gpt-spinner" style="
    display: none;
    margin-left: 16px;
    margin-top: 50px;
    align-items: center;
    justify-content: center;
    width: 520px; /* Wider container for progress bar */
  ">
    <div style="
      width: 100%; 
      height: 28px; 
      position: relative;
    ">
      <!-- Progress Bar Track -->
      <div style="
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 100%;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
      ">
        <!-- Progress Fill -->
        <div id="progress-fill" style="
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 0%;
          background: linear-gradient(270deg, #3B82F6, #60A5FA, #3B82F6);
          background-size: 200% 200%;
          animation: pulse 2s ease infinite;
          border-radius: 4px;
          transition: width 0.5s ease;
        "></div>
      </div>
      
      <!-- Moving Clipboard -->
      <div id="moving-clipboard" style="
        position: absolute;
        top: -20px;
        left: 0;
        width: 24px;
        height: 28px;
        background: #3B82F6;
        border-radius: 3px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.15);
        transform-origin: center;
        animation: miniPulse 1.2s ease-in-out infinite;
        transition: left 0.5s ease;
      ">
        <!-- Top clip -->
        <div style="
          position: absolute;
          top: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 6px;
          background: #1E40AF;
          border-radius: 2px 2px 0 0;
        "></div>
        <!-- Lines -->
        <div style="
          position: absolute;
          top: 6px;
          left: 4px;
          width: 16px;
          height: 2px;
          background: white;
          opacity: 0.8;
          animation: lineFade 1.2s ease-in-out infinite;
        "></div>
        <div style="
          position: absolute;
          top: 12px;
          left: 4px;
          width: 14px;
          height: 2px;
          background: white;
          opacity: 0.6;
          animation: lineFade 1.2s ease-in-out 0.2s infinite;
        "></div>
        <div style="
          position: absolute;
          top: 18px;
          left: 4px;
          width: 18px;
          height: 2px;
          background: white;
          opacity: 0.7;
          animation: lineFade 1.2s ease-in-out 0.4s infinite;
        "></div>
      </div>
    </div>
    <style>
      @keyframes miniPulse {
        0%, 100% { transform: scale(1) rotate(0deg); }
        30% { transform: scale(1.05) rotate(2deg); }
        60% { transform: scale(0.95) rotate(-2deg); }
      }
      @keyframes lineFade {
        0%, 100% { opacity: 0.4; width: 12px; }
        50% { opacity: 0.9; width: 18px; }
      }
      @keyframes pulse {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    </style>
  </div>
</div>

</div>

</div>
`
  }

 <div id="instructions-text-container" style="padding: 0 1.5rem 1.5rem; display: none;">
    <h3 style="
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
      margin: 1rem 0 0.75rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    ">
      📝 Extracted Instructions
    </h3>
    <div id="instructions-text" style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.875rem;
      line-height: 1.5;
      color: #374151;
      padding: 0.5rem;
      background: #f9fafb;
      border-radius: 0.5rem;
    "></div>
    <div id="review-prompt" style="
  margin-top: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: #4b5563;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
">
  <p>If this helped you, please consider <a href="https://chromewebstore.google.com/detail/just-the-instructions/lfoilkbebjommkenfehehofgoiopmenn" target="_blank" style="color: #2563eb; text-decoration: underline;">leaving a review 🌟</a> — JustTheInstructions Team!</p>

  </div>

  </div>

</div>


  `;
  shadow.appendChild(container);

  const settingsBtn = shadow.querySelector("#settings-btn");
  const settingsMenu = shadow.querySelector("#settings-menu");
  const notifyToggle = shadow.querySelector("#notify-toggle");

  const notifyInput = shadow.querySelector("#notify-toggle");
  const notifySlider = shadow.querySelector("#notify-slider-circle");
  const notifySpan = notifyInput?.nextElementSibling;

  notifyInput.addEventListener("change", () => {
    const isChecked = notifyInput.checked;
    if (notifySpan)
      notifySpan.style.backgroundColor = isChecked ? "#2563eb" : "#ccc";
    if (notifySlider)
      notifySlider.style.transform = isChecked
        ? "translateX(18px)"
        : "translateX(0)";
  });

  // Load saved preference
  chrome.storage.local.get("notificationsEnabled", (res) => {
    const isChecked = res.notificationsEnabled !== false;
    notifyToggle.checked = isChecked;

    if (notifySpan)
      notifySpan.style.backgroundColor = isChecked ? "#2563eb" : "#ccc";

    if (notifySlider)
      notifySlider.style.transform = isChecked
        ? "translateX(18px)"
        : "translateX(0)";
  });

  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Don't trigger outside click handler
    const visible = settingsMenu.style.display === "block";
    settingsMenu.style.display = visible ? "none" : "block";
  });

  // Close settings menu if clicking outside of it
  document.addEventListener(
    "click",
    function handleOutsideClick(e) {
      // Use composedPath() to support shadow DOM clicks
      const path = e.composedPath();
      const clickedInsideMenu = path.includes(settingsMenu);
      const clickedSettingsBtn = path.includes(settingsBtn);

      if (!clickedInsideMenu && !clickedSettingsBtn) {
        settingsMenu.style.display = "none";
      }
    },
    true
  );

  notifyToggle.addEventListener("change", (e) => {
    chrome.storage.local.set({ notificationsEnabled: e.target.checked });
  });

  document.body.appendChild(floatingUI);

  document.addEventListener(
    "click",
    function outsideClickListener(event) {
      if (!floatingUI?.contains(event.target)) {
        if (floatingUI?.parentElement) {
          floatingUI.parentElement.removeChild(floatingUI);
          floatingUI = null;
          document.removeEventListener("click", outsideClickListener, true);
        }
      }
    },
    true // Important to catch events in shadow DOM
  );

  shadow.querySelector("#close-btn").addEventListener("click", () => {
    if (floatingUI?.parentElement) {
      floatingUI.parentElement.removeChild(floatingUI);
      floatingUI = null;
    }
  });

  return shadow;
}

async function extractInstructions(toggleVisible = true, skipNotify = false) {
  const pageTitle = document.title || window.location.href;
  const currentUrl = window.location.href;

  const nonContentPatterns = [
    /^chrome:\/\//,
    /^about:/,
    /mail\.google\.com/,
    /docs\.google\.com/,
    /drive\.google\.com/,
    /calendar\.google\.com/,
    /meet\.google\.com/,
    /web\.whatsapp\.com/,
    /web\.telegram\.org/,
    /web\.skype\.com/,
    /outlook\.live\.com/,
    /facebook\.com/,
    /twitter\.com/,
    /instagram\.com/,
    /youtube\.com\/watch/,
    /netflix\.com\/watch/,
    /reddit\.com/,
    /discord\.com/,
    /accounts\.google\.com/,
  ];

  const isNonContentPage = nonContentPatterns.some((pattern) =>
    pattern.test(currentUrl)
  );

  // Skip pages with minimal text content
  const mainContent = document.querySelector('main, article, [role="main"]');
  const hasMinimalContent = mainContent
    ? (mainContent.textContent || "").trim().length < 200
    : document.body.textContent.trim().length < 200;

  if (isNonContentPage || hasMinimalContent) {
    return;
  }

  const elements = document.querySelectorAll("p, li, td, h1, h2, h3, h4, h5");

  // ⛔ Only create/show the floating UI if requested
  let shadow = null;
  if (toggleVisible) {
    shadow = createFloatingUI(pageTitle);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  const loading = shadow?.querySelector("#loading-indicator");
  const output = shadow?.querySelector("#instructions-text");
  const scoreLabel = shadow?.querySelector("#average-score");
  const floatingContainer = shadow?.querySelector("#floating-container");

  if (loading) {
    loading.style.display = "flex";

    // Add overlay for better visibility
    const overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.7);
      z-index: 5;
      border-radius: 0.75rem;
    `;
    if (floatingContainer && !shadow.querySelector("#loading-overlay")) {
      floatingContainer.appendChild(overlay);
    }
  }

  //if (output) output.style.display = "none";
  if (output) output.innerHTML = "";
  if (scoreLabel) scoreLabel.textContent = "";

  let instructionElements = 0;
  let totalElements = 0;
  let instructionScores = [];
  let matchedBlocks = [];

  const isValidText = (text) => {
    const alphaRatio = text.replace(/[^a-zA-Z0-9 ]/g, "").length / text.length;
    return (
      text.length >= 20 &&
      /[a-zA-Z]/.test(text) &&
      /\s/.test(text) &&
      alphaRatio >= 0.7
    );
  };

  try {
    for (const el of elements) {
      const rawText = el.textContent.trim();
      if (!isValidText(rawText)) continue;

      totalElements++;
      const score = await runLocalModel(rawText);

      if (score >= 0.1) {
        instructionElements++;
        instructionScores.push(score);
        matchedBlocks.push({ text: rawText, confidence: score });
      }
    }
    if (loading) loading.style.display = "none";
    // Remove the loading overlay if it exists
    const overlay = shadow?.querySelector("#loading-overlay");
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (output) output.style.display = "block";

    const hitRate = instructionElements / totalElements;
    const avgConfidence =
      instructionScores.length > 0
        ? instructionScores.reduce((a, b) => a + b, 0) /
          instructionScores.length
        : 0;

    let header = "";
    let instructionTier = "none";

    if (
      (instructionElements >= 15 && hitRate >= 0.2 && avgConfidence >= 0.45) ||
      (hitRate >= 0.25 && avgConfidence >= 0.35)
    ) {
      header = "✅ Strong Instructional Content Detected";
      instructionTier = "strong";
    } else if (
      instructionElements >= 5 &&
      ((hitRate >= 0.1 && avgConfidence >= 0.35) ||
        (hitRate >= 0.14 && avgConfidence >= 0.25))
    ) {
      header = "⚠️ Possible Instructions Found";
      instructionTier = "moderate";
    } else {
      header = "❌ No Instructional Content Detected";
    }
    // 🧠 Save summary to storage for later reuse
    chrome.storage.local.set({
      [`instruction_summary_${currentUrl}`]: {
        tier: instructionTier,
        hitRate: (hitRate * 100).toFixed(1),
        avgConfidence: (avgConfidence * 100).toFixed(1),
        matched: instructionElements,
        total: totalElements,
      },
    });

    if (!skipNotify) {
      chrome.runtime.sendMessage({
        action: "instructionAnalysis",
        tier: instructionTier,
      });
    } else {
      // Optional: mark as "refreshed" to suppress badge flash etc.
      chrome.runtime.sendMessage({
        action: "instructionAnalysis",
        tier: "refreshed", // <-- special tier for silent updates
      });
    }

    if (toggleVisible) {
      scoreLabel.innerHTML = `
  <div class="text-left mt-2 space-y-1">
    <p class="font-semibold">${header}</p>
    <button id="toggle-reasoning" class="text-sm text-blue-600 underline cursor-pointer">
      Show reasoning
    </button>
    <div id="reasoning-details" class="mt-2 hidden text-sm text-gray-600 space-y-1">
      <p>📊 Matched <span class="font-medium">${instructionElements}/${totalElements}</span> with instructions-based text (${(
        hitRate * 100
      ).toFixed(1)}%)</p>
      <p>📈 Average Confidence: <span class="font-medium">${(
        avgConfidence * 100
      ).toFixed(1)}%</span></p>
    </div>
  </div>
`;

      const toggleReasoning = shadow.querySelector("#toggle-reasoning");
      const reasoningDetails = shadow.querySelector("#reasoning-details");

      if (toggleReasoning && reasoningDetails) {
        toggleReasoning.addEventListener("click", () => {
          const isVisible = !reasoningDetails.classList.contains("hidden");
          reasoningDetails.classList.toggle("hidden");
          toggleReasoning.textContent = isVisible
            ? "Show reasoning"
            : "Hide reasoning";
        });
      }

      if (matchedBlocks.length === 0) {
        output.textContent = "No instruction-like content found on this page.";
      } else {
        matchedBlocks.sort((a, b) => b.confidence - a.confidence);
        matchedBlocks.forEach(({ text, confidence }) => {
          const block = document.createElement("div");
          block.className = "mb-3";
          // In extractInstructions(), modify the block creation:
          block.innerHTML = `
<div style="
  border-left: 4px solid ${
    confidence > 0.75
      ? "#16a34a" // green
      : confidence > 0.5
      ? "#facc15" // yellow
      : "#ef4444" // red
  }; 
  padding: 0.5rem 0 0.5rem 1rem;
  margin: 0.5rem 0;
  background-color: #f9fafb;
  border-radius: 0 0.375rem 0.375rem 0;
">
  <p style="
    margin: 0;
    color: #111827;
    font-size: 0.875rem;
    line-height: 1.5;
  ">${text}</p>
  <p style="
    margin: 0.25rem 0 0 0;
    color: #6b7280;
    font-size: 0.75rem;
    font-style: italic;
  ">Confidence: ${(confidence * 100).toFixed(2)}%</p>
</div>`;

          output.appendChild(block);
        });
      }
    }
  } catch (error) {
    if (loading) loading.style.display = "none";
    clearTimeout(animationTimeoutId);
    // Remove the loading overlay if it exists
    const overlay = shadow?.querySelector("#loading-overlay");
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (output)
      output.textContent =
        "❌ Error during model run. See console for details.";
  }
}

async function toggleFloatingUI() {
  const pageTitle = document.title || window.location.href;
  const currentUrl = window.location.href;
  const shadow = createFloatingUI(pageTitle); // still needed to inject shell
  const bodyWrapper = shadow?.querySelector("#body-wrapper");
  if (bodyWrapper) bodyWrapper.style.display = "block";

  const { [`instruction_summary_${currentUrl}`]: summary } =
    await chrome.storage.local.get([`instruction_summary_${currentUrl}`]);

  if (!summary) {
    // First time opening on this page, no cache — extract instructions now
    await extractInstructions(true); // this will populate storage + UI
    return;
  }

  const { tier, hitRate, avgConfidence, matched, total } = summary;
  const scoreLabel = shadow.querySelector("#average-score");
  const output = shadow.querySelector("#instructions-text");

  if (scoreLabel) {
    let color =
      tier === "strong"
        ? "text-green-600"
        : tier === "moderate"
        ? "text-yellow-600"
        : "text-red-600";

    scoreLabel.innerHTML = `
  <div class="text-left mt-2 space-y-1">
    <p class="${color} font-semibold mb-1">
      ${
        tier === "strong"
          ? "✅ Strong Instructions Detected"
          : tier === "moderate"
          ? "⚠️ Some Instructions Detected"
          : "❌ No Instructions Detected"
      }
    </p>
    <button id="toggle-reasoning" class="text-sm text-blue-600 underline cursor-pointer">
      Show reasoning
    </button>
    <div id="reasoning-details" class="mt-2 hidden text-sm text-gray-600 space-y-1">
      <p>📊 Matched <span class="font-medium">${matched}/${total}</span> with instructions-based text (${hitRate}%)</p>
      <p>📈 Average Confidence: <span class="font-medium">${avgConfidence}%</span></p>
      <details class="mt-10 text-xs text-gray-500" style="margin-top: 10px; margin-left: 10px;">
  <summary class="cursor-pointer">What does this mean?</summary>
  <p>We use a local ML model to determine whether a block of text is instructional (e.g. contains steps, how-tos, or structured info). Confidence represents how sure the model is.</p>
</details>

    </div>
  </div>
`;

    const toggleReasoning = shadow.querySelector("#toggle-reasoning");
    const reasoningDetails = shadow.querySelector("#reasoning-details");

    if (toggleReasoning && reasoningDetails) {
      toggleReasoning.addEventListener("click", () => {
        const isVisible = !reasoningDetails.classList.contains("hidden");
        reasoningDetails.classList.toggle("hidden");
        toggleReasoning.textContent = isVisible
          ? "Show reasoning"
          : "Hide reasoning";
      });
    }
  }

  if (output) {
    output.innerHTML = "";
  }

  const gptBtn = shadow.querySelector("#generate-with-gpt");
  if (gptBtn) {
    gptBtn.onclick = null;

    gptBtn.onclick = async () => {
      const shadowRoot = floatingUI.shadowRoot;
      const gptContainer = shadowRoot.querySelector("#gpt-action-container");
      const gptSpinner = shadowRoot.querySelector("#gpt-spinner");
      const gptBtn = shadowRoot.querySelector("#generate-with-gpt");
      const output = shadowRoot.querySelector("#instructions-text");
      const scoreLabel = shadowRoot.querySelector("#average-score");
      const instructionsContainer = shadowRoot.querySelector(
        "#instructions-text-container"
      );

      // ADDED: Start progress animation for GPT extraction
      const spinner = shadowRoot.querySelector("#gpt-spinner");
      const fill = spinner?.querySelector("#progress-fill");
      const clipboard = spinner?.querySelector("#moving-clipboard");

      if (spinner && fill && clipboard) {
        // Reset positions
        fill.style.width = "0%";
        clipboard.style.left = "0px";

        let progress = 0;

        let lastTime = null;

        const animate = (timestamp) => {
          if (progress >= 100) return;

          if (!lastTime) lastTime = timestamp;
          const delta = timestamp - lastTime;
          lastTime = timestamp;

          // Vary the speed, but scale it with delta for smoother motion
          const speed = Math.random() * 0.025 + 0.01; // tweak for desired feel
          progress += speed * delta;
          progress = Math.min(progress, 100);

          // Update positions
          fill.style.width = progress + "%";
          clipboard.style.left = `calc(${progress}% - 12px)`;

          requestAnimationFrame(animate);
        };

        // Start animation
        requestAnimationFrame(animate);
      }

      try {
        // Show loading state
        if (gptBtn) gptBtn.style.display = "none";
        if (gptSpinner) gptSpinner.style.display = "flex";
        if (scoreLabel)
          scoreLabel.innerHTML = `<p class="font-semibold text-blue-600">🔍 Extracting instructions with AI. This will only take a few seconds...</p>`;

        // Get page content
        const pageText = Array.from(
          document.querySelectorAll("h1, h2, h3, h4, h5, p, li, td")
        )
          .map((el) => el.textContent.trim())
          .filter((text) => text.length > 0)
          .join("\n");

        // Get user ID
        const { userId } = await chrome.storage.local.get("userId");

        // Call API "https://instructions-api-2-561360507997.us-central1.run.app/generate"
        const response = await fetch(
          "https://instructions-api-2-561360507997.us-central1.run.app/generate", // Use local API for development
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              prompt: `Extract instructions:\n${pageText}`,
            }),
          }
        );

        const data = await response.json(); // Process response
        if (gptSpinner) {
          // Smooth fadeout for the spinner
          gptSpinner.style.opacity = "1";
          gptSpinner.style.transition = "opacity 0.3s ease";
          gptSpinner.style.opacity = "0";
          setTimeout(() => {
            gptSpinner.style.display = "none";
          }, 300);
        }
        if (gptBtn) gptBtn.remove();

        // Hide the entire action container to remove the blank space
        if (gptContainer) {
          gptContainer.style.transition = "opacity 0.3s ease, margin 0.3s ease";
          gptContainer.style.opacity = "0";
          gptContainer.style.marginTop = "0";
          gptContainer.style.marginBottom = "0";
          setTimeout(() => {
            gptContainer.style.display = "none";
            gptContainer.style.height = "0";
          }, 300);
        }

        if (response.status === 429) {
          scoreLabel.innerHTML = `<p class="text-red-600 font-semibold text-sm">⛔ Daily limit reached (3 requests max/day)</p>`;
          return;
        }

        if (output) output.style.display = "block";

        if (data.response?.trim()) {
          if (instructionsContainer)
            instructionsContainer.style.display = "block";

          output.innerHTML = `
  <style>
.markdown h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0.25rem 0 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.25rem;
}

.markdown h2 {
  font-size: 1.25rem;
  font-weight: 600;d
  color: #1f2937;
  margin: 1rem 0 0.5rem;
}

.markdown h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin: 0.75rem 0 0.4rem;
}


    .markdown p {
      margin: 0.4rem 0;
      line-height: 1.6;
    }

    .markdown ul, .markdown ol {
      margin: 0.5rem 0 0.5rem 1.25rem;
      padding-left: 1rem;
    }

    .markdown ul {
      list-style-type: disc;
    }

    .markdown ol {
      list-style-type: decimal;
    }

    .markdown li {
      margin-bottom: 0.25rem;
    }

    .markdown li > ul {
      list-style-type: circle;
      margin-top: 0.25rem;
    }

    .markdown strong {
      font-weight: 600;
    }
  </style>
  <div class="markdown" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 0.875rem;">
    ${marked.parse(data.response)}
  </div>
`;

          scoreLabel.textContent = `✅ Just The Instructions AI finished`;
        } else {
          if (instructionsContainer)
            instructionsContainer.style.display = "block";
          output.innerHTML = `
  <div style="
    padding: 1rem;
    background-color: #f9fafb;
    border-radius: 0.375rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
  ">
    No instruction-like content found on this page.
  </div>
`;
          scoreLabel.textContent = `⚠️ GPT returned empty result`;
        }
      } catch (err) {
        if (gptSpinner) {
          // Smooth fadeout for the spinner even on error
          gptSpinner.style.opacity = "1";
          gptSpinner.style.transition = "opacity 0.3s ease";
          gptSpinner.style.opacity = "0";
          setTimeout(() => {
            gptSpinner.style.display = "none";
          }, 300);
        }

        // On error, show the button again but still clean up the container layout
        if (gptBtn) gptBtn.style.display = "inline-block";

        // In case of repeated errors, make sure the container is properly visible
        if (gptContainer) {
          gptContainer.style.display = "flex";
          gptContainer.style.opacity = "1";
          gptContainer.style.marginTop = "32px";
          gptContainer.style.marginBottom = "24px";
        }
        if (output) {
          output.innerHTML = `
  <div style="
    padding: 1rem;
    background-color: #fef2f2;
    border-radius: 0.375rem;
    color: #dc2626;
    font-size: 0.875rem;
  ">
    ❌ GPT Analysis Failed. See console for details.
  </div>
`;
          output.style.display = "block";
        }
        scoreLabel.textContent = "❌ Error calling JustTheInstructions AI";
      }
    };
  }
}

// Handle messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "copyText") {
    extractInstructions();
    sendResponse(true);
  } else if (request.action === "getPageText") {
    const elements = document.querySelectorAll(
      "h1, h2, h3, h4, h5, p, li, td, caption, a"
    );
    const text = Array.from(elements)
      .map((el) => el.textContent)
      .join(" ");
    sendResponse(text);
  } else if (request.action === "toggleFloatingUI") {
    toggleFloatingUI();
    sendResponse(true);
  } else if (request.action === "extractInstructions") {
    extractInstructions(false);
    sendResponse(true);
  } else if (request.action === "triggerGPTExtraction") {
    toggleFloatingUI();

    // Wait for UI to render then click GPT button
    setTimeout(() => {
      if (floatingUI && floatingUI.shadowRoot) {
        const gptBtn =
          floatingUI.shadowRoot.querySelector("#generate-with-gpt");
        if (gptBtn) {
          gptBtn.click();
        } else {
        }
      }
    }, 500); // Short delay to ensure UI is rendered

    sendResponse(true);
  }

  return true; // Important for async response
});
