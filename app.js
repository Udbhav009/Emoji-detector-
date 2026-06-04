/* ═══════════════════════════════════════════════════════════════════════
   EmojiMind — Frontend Logic
   ═══════════════════════════════════════════════════════════════════════ */

const API_BASE = "http://127.0.0.1:5050";
const MAX_HISTORY = 6;

// ── DOM refs ──────────────────────────────────────────────────────────────
const textInput = document.getElementById("text-input");
const charCount = document.getElementById("char-count");
const predictBtn = document.getElementById("predict-btn");
const btnSpinner = document.getElementById("btn-spinner");
const emojiGrid = document.getElementById("emoji-grid");
const resultsPlaceholder = document.getElementById("results-placeholder");
const resultsLoading = document.getElementById("results-loading");
const copyBar = document.getElementById("copy-bar");
const copyPreview = document.getElementById("copy-preview");
const copyBtn = document.getElementById("copy-btn");
const copyToast = document.getElementById("copy-toast");
const saveBtn = document.getElementById("save-btn");
const saveToast = document.getElementById("save-toast");
const composeOpenBtn = document.getElementById("compose-open-btn");
const composeOverlay = document.getElementById("compose-overlay");
const composeClose = document.getElementById("compose-close");
const composePalette = document.getElementById("compose-palette");
const composeTextarea = document.getElementById("compose-textarea");
const composeCharCount = document.getElementById("compose-char-count");
const composeClearBtn = document.getElementById("compose-clear-btn");
const composeCopyBtn = document.getElementById("compose-copy-btn");
const composeSaveBtn = document.getElementById("compose-save-btn");
const composeToast = document.getElementById("compose-toast");
const convertBtn = document.getElementById("convert-btn");
const convertedPanel = document.getElementById("converted-panel");
const convertedOutput = document.getElementById("converted-output");
const convertedCopyBtn = document.getElementById("converted-copy-btn");
const convertedSaveBtn = document.getElementById("converted-save-btn");
const convertedCloseBtn = document.getElementById("converted-close-btn");
const convertedToast = document.getElementById("converted-toast");
const historySection = document.getElementById("history-section");
const historyList = document.getElementById("history-list");

// ── State ────────────────────────────────────────────────────────────────
let history = [];
let debounceTimer = null;
let lastResults = [];

// ── Floating background particles ─────────────────────────────────────────
const BG_EMOJIS = ["✨", "🌸", "💫", "🎯", "🔮", "⚡", "🦋", "🌊", "🎵", "🚀", "💡", "🎨", "🌈", "💎", "🎭"];
const container = document.getElementById("particles");

function spawnParticle() {
  const el = document.createElement("span");
  el.className = "particle";
  el.textContent = BG_EMOJIS[Math.floor(Math.random() * BG_EMOJIS.length)];
  el.style.left = `${Math.random() * 100}%`;
  el.style.fontSize = `${1 + Math.random() * 1.4}rem`;
  const dur = 14 + Math.random() * 18;
  el.style.animationDuration = `${dur}s`;
  el.style.animationDelay = `${-Math.random() * dur}s`;
  container.appendChild(el);
  setTimeout(() => el.remove(), dur * 1000);
}

// Spawn initial batch
for (let i = 0; i < 14; i++) spawnParticle();
setInterval(spawnParticle, 2200);

// ── Character counter ──────────────────────────────────────────────────────
textInput.addEventListener("input", () => {
  const len = textInput.value.length;
  charCount.textContent = `${len} / 500`;
  charCount.classList.toggle("warn", len > 400);
});

// ── Example chips ──────────────────────────────────────────────────────────
document.querySelectorAll(".example-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    textInput.value = chip.dataset.text;
    textInput.dispatchEvent(new Event("input"));
    textInput.focus();
    runPrediction();
  });
});

// ── Keyboard shortcut: Ctrl/Cmd + Enter ──────────────────────────────────
textInput.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runPrediction();
  }
});

predictBtn.addEventListener("click", runPrediction);

// ── Core prediction flow ───────────────────────────────────────────────────
async function runPrediction() {
  const text = textInput.value.trim();
  if (!text) { shake(textInput); return; }

  setLoading(true);
  showState("loading");

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, top_k: 8 }),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    lastResults = data.emojis || [];
    renderResults(lastResults, text);
    addHistory(text, lastResults.slice(0, 5));
  } catch (err) {
    console.error(err);
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

// ── Render emoji cards ─────────────────────────────────────────────────────
function renderResults(emojis, inputText) {
  if (!emojis.length) { showState("placeholder"); return; }

  emojiGrid.innerHTML = "";

  emojis.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = `emoji-card${idx === 0 ? " top-pick" : ""}`;
    card.style.animationDelay = `${idx * 0.06}s`;
    card.title = `Click to copy ${item.emoji}`;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `${item.label} — ${item.pct}% match`);

    card.innerHTML = `
      ${idx === 0 ? '<span class="top-badge">Best match</span>' : ""}
      <span class="emoji-symbol">${item.emoji}</span>
      <span class="emoji-label">${item.label}</span>
      <div class="confidence-bar-wrap">
        <div class="confidence-bar" data-pct="${item.pct}"></div>
      </div>
      <span class="confidence-pct">${item.pct}% match</span>
    `;

    card.addEventListener("click", () => copySingle(item.emoji, card));
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") copySingle(item.emoji, card); });

    emojiGrid.appendChild(card);

    // Animate bar after mount
    requestAnimationFrame(() => {
      setTimeout(() => {
        const bar = card.querySelector(".confidence-bar");
        if (bar) bar.style.width = `${item.pct}%`;
      }, 80 + idx * 60);
    });
  });

  // Update copy bar
  const allEmojis = emojis.map(e => e.emoji).join(" ");
  copyPreview.textContent = allEmojis;

  showState("results");
}

// ── Copy a single emoji ────────────────────────────────────────────────────
async function copySingle(emoji, card) {
  try {
    await navigator.clipboard.writeText(emoji);
    card.style.background = "rgba(139,92,246,0.2)";
    card.style.borderColor = "rgba(139,92,246,0.6)";
    setTimeout(() => {
      card.style.background = "";
      card.style.borderColor = "";
    }, 800);
  } catch {
    /* clipboard denied */
  }
}

// ── Copy all emojis ────────────────────────────────────────────────────────
copyBtn.addEventListener("click", async () => {
  const text = copyPreview.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copyToast.classList.remove("hidden");
    setTimeout(() => copyToast.classList.add("hidden"), 1800);
  } catch { /* clipboard denied */ }
});

// ── Save to .txt file ──────────────────────────────────────────────────────
saveBtn.addEventListener("click", () => {
  if (!lastResults.length) return;

  const inputText = textInput.value.trim();
  const timestamp = new Date().toLocaleString();
  const emojiLine = lastResults.map(e => e.emoji).join("  ");
  const detailLines = lastResults
    .map((e, i) => `  ${i + 1}. ${e.emoji}  ${e.label.padEnd(16)} — ${e.pct}% match`)
    .join("\n");

  const content = [
    "════════════════════════════════════",
    "  EmojiMind — Prediction Result",
    "════════════════════════════════════",
    "",
    `📅 Date/Time : ${timestamp}`,
    `📝 Input Text: ${inputText}`,
    "",
    "🎯 Predicted Emojis:",
    `   ${emojiLine}`,
    "",
    "📊 Detailed Scores:",
    detailLines,
    "",
    "────────────────────────────────────",
    "Powered by EmojiMind (NLP · Sentence Transformers)",
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = inputText.slice(0, 30).replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "emoji_result";
  a.href = url;
  a.download = `emojimind_${safeName}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  saveToast.classList.remove("hidden");
  setTimeout(() => saveToast.classList.add("hidden"), 2000);
});

// ── History ────────────────────────────────────────────────────────────────
function addHistory(text, emojis) {
  // Remove duplicate if exists
  history = history.filter(h => h.text !== text);
  history.unshift({ text, emojis });
  if (history.length > MAX_HISTORY) history.pop();
  renderHistory();
}

function renderHistory() {
  if (!history.length) { historySection.classList.add("hidden"); return; }
  historySection.classList.remove("hidden");
  historyList.innerHTML = "";

  history.forEach(({ text, emojis }) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.innerHTML = `
      <span class="history-text">${escHtml(text)}</span>
      <span class="history-emojis">${emojis.map(e => e.emoji).join("")}</span>
    `;
    item.addEventListener("click", () => {
      textInput.value = text;
      textInput.dispatchEvent(new Event("input"));
      textInput.focus();
      runPrediction();
    });
    item.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") item.click();
    });
    historyList.appendChild(item);
  });
}

// ── UI state machine ───────────────────────────────────────────────────────
function showState(state) {
  resultsPlaceholder.classList.toggle("hidden", state !== "placeholder");
  resultsLoading.classList.toggle("hidden", state !== "loading");
  emojiGrid.classList.toggle("hidden", state !== "results");
  copyBar.classList.toggle("hidden", state !== "results");
}

function setLoading(on) {
  predictBtn.disabled = on;
  predictBtn.classList.toggle("loading", on);
}

function showError(msg) {
  emojiGrid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:2rem;color:#f87171;">
      <div style="font-size:2.5rem;margin-bottom:.5rem">⚠️</div>
      <p style="font-weight:600">Prediction failed</p>
      <p style="font-size:.82rem;color:#94a3b8;margin-top:.4rem">${escHtml(msg)}</p>
      <p style="font-size:.78rem;color:#64748b;margin-top:.6rem">Make sure the Flask server is running on port 5050.</p>
    </div>
  `;
  showState("results");
  copyBar.classList.add("hidden");
}

// ── Shake animation on empty submit ───────────────────────────────────────
function shake(el) {
  el.animate([
    { transform: "translateX(0)" },
    { transform: "translateX(-6px)" },
    { transform: "translateX(6px)" },
    { transform: "translateX(-5px)" },
    { transform: "translateX(5px)" },
    { transform: "translateX(0)" },
  ], { duration: 400, easing: "ease" });
}

// ── Utilities ──────────────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ── Init ───────────────────────────────────────────────────────────────────
showState("placeholder");
textInput.focus();

// ── Compose Modal ──────────────────────────────────────────────────────────
function openCompose() {
  // Build emoji palette from last results (or hint if none)
  composePalette.innerHTML = "";
  if (lastResults.length) {
    lastResults.forEach(item => {
      const btn = document.createElement("button");
      btn.className = "compose-emoji-btn";
      btn.textContent = item.emoji;
      btn.title = `Insert ${item.label}`;
      btn.setAttribute("aria-label", `Insert ${item.emoji} ${item.label}`);
      btn.addEventListener("click", () => insertEmojiAtCursor(item.emoji));
      composePalette.appendChild(btn);
    });
  } else {
    composePalette.innerHTML = `<span class="compose-palette-hint">Run a prediction first to get emojis here ✨</span>`;
  }
  composeOverlay.classList.remove("hidden");
  setTimeout(() => composeTextarea.focus(), 80);
}

function closeCompose() {
  composeOverlay.classList.add("hidden");
}

// Insert emoji at the current cursor position in the compose textarea
function insertEmojiAtCursor(emoji) {
  const start = composeTextarea.selectionStart;
  const end = composeTextarea.selectionEnd;
  const before = composeTextarea.value.slice(0, start);
  const after  = composeTextarea.value.slice(end);
  composeTextarea.value = before + emoji + after;
  // Restore cursor after the inserted emoji
  const newPos = start + emoji.length;
  composeTextarea.setSelectionRange(newPos, newPos);
  composeTextarea.focus();
  updateComposeChar();
}

function updateComposeChar() {
  const len = composeTextarea.value.length;
  composeCharCount.textContent = `${len} char${len !== 1 ? "s" : ""}`;
}

// Open / close
composeOpenBtn.addEventListener("click", openCompose);
composeClose.addEventListener("click", closeCompose);

// Close on overlay backdrop click
composeOverlay.addEventListener("click", e => {
  if (e.target === composeOverlay) closeCompose();
});

// Close on Escape
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !composeOverlay.classList.contains("hidden")) closeCompose();
});

// Live char count
composeTextarea.addEventListener("input", updateComposeChar);

// Clear button
composeClearBtn.addEventListener("click", () => {
  composeTextarea.value = "";
  updateComposeChar();
  composeTextarea.focus();
});

// Copy composed message
composeCopyBtn.addEventListener("click", async () => {
  const msg = composeTextarea.value;
  if (!msg.trim()) return;
  try {
    await navigator.clipboard.writeText(msg);
    composeToast.textContent = "Copied!";
    composeToast.classList.remove("hidden");
    setTimeout(() => composeToast.classList.add("hidden"), 1800);
  } catch { /* denied */ }
});

// Save composed message as .txt
composeSaveBtn.addEventListener("click", () => {
  const msg = composeTextarea.value;
  if (!msg.trim()) return;
  const timestamp = new Date().toLocaleString();
  const content = [
    "════════════════════════════════════",
    "  EmojiMind — Composed Message",
    "════════════════════════════════════",
    "",
    `📅 Date/Time : ${timestamp}`,
    "",
    msg,
    "",
    "────────────────────────────────────",
    "Powered by EmojiMind (NLP · Sentence Transformers)",
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = msg.trim().slice(0, 30).replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "composed";
  a.href = url;
  a.download = `composed_${safeName}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  composeToast.textContent = "Saved!";
  composeToast.classList.remove("hidden");
  setTimeout(() => composeToast.classList.add("hidden"), 2000);
});

// ── Convert Text with Emojis ────────────────────────────────────────────

/**
 * Splits text into sentences, inserts the top emojis after each sentence,
 * and sprinkles any leftover emojis at the end.
 */
function convertTextWithEmojis(text, emojis) {
  if (!text.trim() || !emojis.length) return text;

  // Split on sentence-ending punctuation, keeping the delimiter
  const sentenceRe = /([^.!?\n]+[.!?\n]*)/g;
  const sentences = text.match(sentenceRe) || [text];
  const pool = emojis.map(e => e.emoji); // ordered by confidence

  let emojiIdx = 0;
  const parts = sentences.map(sentence => {
    const trimmed = sentence.trimEnd();
    if (!trimmed) return sentence;
    // Insert one emoji per sentence (cycle through pool)
    const emoji = pool[emojiIdx % pool.length];
    emojiIdx++;
    // Place emoji right before trailing whitespace/newline
    const trailingMatch = sentence.match(/(\s*)$/);
    const trail = trailingMatch ? trailingMatch[0] : "";
    return trimmed + " " + emoji + trail;
  });

  let result = parts.join("");

  // If there are still more emojis than sentences, append the rest at the end
  if (pool.length > sentences.length) {
    const extras = pool.slice(sentences.length).join(" ");
    result = result.trimEnd() + "  " + extras;
  }

  return result;
}

/** Plain-text version (no HTML) for copy/save */
let lastConvertedText = "";

convertBtn.addEventListener("click", () => {
  const raw = textInput.value.trim();
  if (!raw || !lastResults.length) {
    shake(convertBtn);
    return;
  }

  lastConvertedText = convertTextWithEmojis(raw, lastResults);

  // Render with highlighted emojis
  const highlighted = lastConvertedText.replace(
    /([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}])/gu,
    '<span class="converted-emoji">$1</span>'
  );

  convertedOutput.innerHTML = `<p class="converted-text">${highlighted}</p>`;
  convertedPanel.classList.remove("hidden");
  convertedPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// Copy converted text
convertedCopyBtn.addEventListener("click", async () => {
  if (!lastConvertedText) return;
  try {
    await navigator.clipboard.writeText(lastConvertedText);
    convertedToast.textContent = "Copied!";
    convertedToast.classList.remove("hidden");
    setTimeout(() => convertedToast.classList.add("hidden"), 1800);
  } catch { /* denied */ }
});

// Save converted text as .txt
convertedSaveBtn.addEventListener("click", () => {
  if (!lastConvertedText) return;
  const timestamp = new Date().toLocaleString();
  const content = [
    "════════════════════════════════════",
    "  EmojiMind — Converted Text",
    "════════════════════════════════════",
    "",
    `📅 Date/Time : ${timestamp}`,
    "",
    lastConvertedText,
    "",
    "────────────────────────────────────",
    "Powered by EmojiMind (NLP · Sentence Transformers)",
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = lastConvertedText.slice(0, 30).replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "converted";
  a.href = url;
  a.download = `emojified_${safeName}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  convertedToast.textContent = "Saved!";
  convertedToast.classList.remove("hidden");
  setTimeout(() => convertedToast.classList.add("hidden"), 2000);
});

// Close converted panel
convertedCloseBtn.addEventListener("click", () => {
  convertedPanel.classList.add("hidden");
  lastConvertedText = "";
});

