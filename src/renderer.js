const searchInput = document.getElementById("searchInput");
const clipList = document.getElementById("clipList");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyText = document.getElementById("emptyText");
const totalCount = document.getElementById("totalCount");
const pinnedCount = document.getElementById("pinnedCount");
const footerCount = document.getElementById("footerCount");
const pauseButton = document.getElementById("pauseButton");
const pauseLabel = document.getElementById("pauseLabel");
const captureStatus = document.getElementById("captureStatus");
const allButton = document.getElementById("allButton");
const pinnedButton = document.getElementById("pinnedButton");
const clearButton = document.getElementById("clearButton");
const listHeading = document.getElementById("listHeading");
const listDescription = document.getElementById("listDescription");

let clips = [];
let showPinnedOnly = false;
let isPaused = false;

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getClipType(text) {
  const trimmed = text.trim();
  if (/^https?:\/\/\S+$/i.test(trimmed)) return "LINK";
  if (/^[\[{]/.test(trimmed) && /[\]}]$/.test(trimmed)) return "CODE / DATA";
  if (trimmed.includes("\n")) return "MULTI-LINE";
  return "TEXT";
}

function makeButton(label, title, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.addEventListener("click", onClick);
  return button;
}

function createClipCard(clip) {
  const card = document.createElement("article");
  card.className = "clip-card";

  const top = document.createElement("div");
  top.className = "clip-top";

  const type = document.createElement("span");
  type.className = "clip-type";
  type.textContent = `▤  ${getClipType(clip.text)}`;

  const time = document.createElement("span");
  time.className = "clip-time";
  time.textContent = formatTime(clip.createdAt);

  const actions = document.createElement("div");
  actions.className = "clip-actions";
  actions.append(
    makeButton(clip.pinned ? "★" : "☆", clip.pinned ? "Unpin clip" : "Pin clip",
      `icon-button${clip.pinned ? " pinned" : ""}`, () => window.clipForge.togglePin(clip.id)),
    makeButton("×", "Delete clip", "icon-button", () => window.clipForge.deleteItem(clip.id))
  );
  top.append(type, time, actions);

  const text = document.createElement("div");
  text.className = "clip-text";
  // textContent prevents clipboard text from being interpreted as HTML.
  text.textContent = clip.text;

  const bottom = document.createElement("div");
  bottom.className = "clip-bottom";

  const meta = document.createElement("span");
  meta.className = "clip-meta";
  meta.textContent = `${clip.text.length.toLocaleString()} characters${clip.pinned ? " · Pinned" : ""}`;

  const copy = makeButton("Copy again  ↗", "Copy this text to clipboard", "copy-button", async () => {
    const result = await window.clipForge.copyItem(clip.id);
    if (result?.ok) {
      copy.textContent = "Copied ✓";
      setTimeout(() => { copy.textContent = "Copy again  ↗"; }, 1100);
    }
  });

  bottom.append(meta, copy);
  card.append(top, text, bottom);
  return card;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = clips.filter(clip => {
    const matchesQuery = clip.text.toLowerCase().includes(query);
    return matchesQuery && (!showPinnedOnly || clip.pinned);
  });

  totalCount.textContent = String(clips.length);
  pinnedCount.textContent = String(clips.filter(clip => clip.pinned).length);
  footerCount.textContent = `${clips.length} clip${clips.length === 1 ? "" : "s"}`;

  clipList.replaceChildren(...filtered.map(createClipCard));
  emptyState.classList.toggle("hidden", filtered.length > 0);
  clipList.classList.toggle("hidden", filtered.length === 0);

  if (filtered.length === 0) {
    if (query) {
      emptyTitle.textContent = "No matching clips";
      emptyText.textContent = "Try another search term.";
    } else if (showPinnedOnly) {
      emptyTitle.textContent = "No pinned clips yet";
      emptyText.textContent = "Pin a clip with the star button and it will live here.";
    } else {
      emptyTitle.textContent = "Nothing copied yet";
      emptyText.textContent = "Copy some text anywhere on your PC and it will show up here.";
    }
  }
}

function setView(pinnedOnly) {
  showPinnedOnly = pinnedOnly;
  allButton.classList.toggle("active", !pinnedOnly);
  pinnedButton.classList.toggle("active", pinnedOnly);
  listHeading.textContent = pinnedOnly ? "Pinned clips" : "Recent clips";
  listDescription.textContent = pinnedOnly ? "Your saved favourites" : "Newest clips appear first";
  render();
}

async function updatePauseState() {
  isPaused = await window.clipForge.getPaused();
  pauseLabel.textContent = isPaused ? "Resume capture" : "Pause capture";
  document.querySelector(".pause-icon").textContent = isPaused ? "▶" : "Ⅱ";
  captureStatus.textContent = isPaused ? "PAUSED" : "CAPTURING";
  document.querySelector(".live-indicator .status-dot").style.background = isPaused ? "#e6b75c" : "";
}

searchInput.addEventListener("input", render);
allButton.addEventListener("click", () => setView(false));
pinnedButton.addEventListener("click", () => setView(true));

pauseButton.addEventListener("click", async () => {
  await window.clipForge.setPaused(!isPaused);
  await updatePauseState();
});

clearButton.addEventListener("click", async () => {
  const hasUnpinned = clips.some(clip => !clip.pinned);
  if (!hasUnpinned) return;
  const confirmed = window.confirm("Delete all unpinned clips? Pinned clips will be kept.");
  if (confirmed) await window.clipForge.clearUnpinned();
});

document.addEventListener("keydown", event => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape") {
    searchInput.value = "";
    searchInput.blur();
    render();
  }
});

window.clipForge.onHistoryUpdated(nextHistory => {
  clips = nextHistory;
  render();
});

(async function init() {
  clips = await window.clipForge.getHistory();
  await updatePauseState();
  render();
})();
