import {
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from "https://cdn.jsdelivr.net/npm/@tanstack/virtual-core@3.17.11/+esm";

const PAGE_SIZE = 120;
const OVERSCAN_ROWS = 3;
const DESKTOP_MIN_CARD_WIDTH = 190;
const MOBILE_MIN_CARD_WIDTH = 145;

const rarityLabels = {
  BASIC: "Basic",
  COMMON: "Common",
  ULTRA_COMMON: "Ultra common",
  RARE: "Rare",
  ULTRA_RARE: "Ultra rare",
  LEGENDARY: "Legendary",
  MYTHIC: "Mythic",
};

const allowedRarities = new Set(Object.keys(rarityLabels));

const el = (id) => document.getElementById(id);

const refs = {
  issuerName: el("issuer-name"),
  issuerId: el("issuer-id"),
  subjectName: el("subject-name"),
  subjectId: el("subject-id"),
  issuedAt: el("issued-at"),
  exportId: el("export-id"),
  cardCount: el("card-count"),
  formatVersion: el("format-version"),
  proofType: el("proof-type"),
  proofAlgorithm: el("proof-algorithm"),
  proofCanonicalization: el("proof-canonicalization"),
  proofKey: el("proof-key"),
  proofHash: el("proof-hash"),
  sourceLabel: el("source-label"),
  cardsViewport: el("cards-viewport"),
  cardsSpacer: el("cards-spacer"),
  virtualStatus: el("virtual-status"),
  inspector: el("card-inspector"),
  rawPanel: el("raw-panel"),
  rawJson: el("raw-json"),
  error: el("viewer-error"),
  fileInput: el("file-input"),
  resetDemo: el("reset-demo"),
};

let currentExport = null;
let cardByInstanceId = new Map();
let selectedInstanceId = null;
let loadedCardCount = 0;
let layout = {
  columns: 1,
  gap: 18,
  rowHeight: 320,
  rowContentHeight: 302,
};
let virtualizer = null;
let virtualizerCleanup = null;
let resizeObserver = null;
let renderFrame = null;
let loadFrame = null;
let exportRevision = 0;
let rawRenderedRevision = -1;
let hostResizeObserver = null;

function notifyHostHeight() {
  if (window.parent === window) return;
  window.parent.postMessage(
    {
      type: "portable-collection-viewer:height",
      height: Math.ceil(document.documentElement.scrollHeight),
    },
    "*",
  );
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function text(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function truncateMiddle(value, max = 64) {
  const string = text(value);
  if (string.length <= max) return string;
  const side = Math.floor((max - 1) / 2);
  return string.slice(0, side) + "…" + string.slice(-side);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return text(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function validateEnvelope(value) {
  if (!value || typeof value !== "object") throw new Error("The selected file is not a JSON object.");
  if (!value.payload || typeof value.payload !== "object") throw new Error("Missing payload object.");
  if (value.payload.format !== "org.wikicard.collection") {
    throw new Error("Unsupported payload.format. Expected org.wikicard.collection.");
  }
  if (!value.payload.collection || !Array.isArray(value.payload.collection.cards)) {
    throw new Error("Missing payload.collection.cards array.");
  }
  if (!value.payload.issuer || !value.payload.subject) {
    throw new Error("Missing issuer or subject information.");
  }
  return value;
}

function setLink(anchor, value) {
  const href = safeHttpUrl(value);
  anchor.textContent = text(value);
  if (href) {
    anchor.href = href;
    anchor.removeAttribute("aria-disabled");
  } else {
    anchor.removeAttribute("href");
    anchor.setAttribute("aria-disabled", "true");
  }
}

function setSummary(exported) {
  const { payload, proof = {} } = exported;
  const cards = payload.collection.cards;

  refs.issuerName.textContent = text(payload.issuer?.name);
  setLink(refs.issuerId, payload.issuer?.id);
  refs.subjectName.textContent = text(payload.subject?.username);
  refs.subjectId.textContent = truncateMiddle(payload.subject?.id, 74);
  refs.issuedAt.textContent = formatDate(payload.issuedAt);
  refs.exportId.textContent = truncateMiddle(payload.exportId, 48);
  refs.cardCount.textContent = cards.length + (cards.length === 1 ? " card" : " cards");
  refs.formatVersion.textContent = `${text(payload.format)} · v${text(payload.version)}`;

  refs.proofType.textContent = text(proof.type);
  refs.proofAlgorithm.textContent = text(proof.algorithm);
  refs.proofCanonicalization.textContent = text(proof.canonicalization);
  refs.proofKey.textContent = text(proof.keyId);
  refs.proofHash.textContent = text(proof.payloadHash);
}

function getVisualData(card) {
  const extensions = card?.extensions && typeof card.extensions === "object" ? card.extensions : {};
  const preferred = extensions["org.wikicard.game.v1"];
  const candidates = [
    preferred,
    ...Object.values(extensions).filter((value) => value && typeof value === "object"),
  ].filter(Boolean);

  let data = {};
  for (const candidate of candidates) {
    if (["rarity", "attack", "defense", "power"].some((key) => key in candidate)) {
      data = candidate;
      break;
    }
  }

  const rarity = allowedRarities.has(String(data.rarity)) ? String(data.rarity) : "BASIC";
  return {
    rarity,
    attack: Number.isFinite(Number(data.attack)) ? Number(data.attack) : null,
    defense: Number.isFinite(Number(data.defense)) ? Number(data.defense) : null,
    power: Number.isFinite(Number(data.power)) ? Number(data.power) : null,
  };
}

function svgIcon(kind) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", kind === "sparkles" ? "12" : "15");
  svg.setAttribute("height", kind === "sparkles" ? "12" : "15");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  const paths = {
    sparkles: [
      ["path", { d: "m12 3-1.6 4.4L6 9l4.4 1.6L12 15l1.6-4.4L18 9l-4.4-1.6L12 3Z" }],
      ["path", { d: "m5 16-.7 1.8L2.5 18.5l1.8.7L5 21l.7-1.8 1.8-.7-1.8-.7L5 16Z" }],
      ["path", { d: "m19 14-.9 2.1L16 17l2.1.9L19 20l.9-2.1L22 17l-2.1-.9L19 14Z" }],
    ],
    swords: [
      ["path", { d: "m14.5 17.5-8-8L4 4l5.5 2.5 8 8" }],
      ["path", { d: "m13 19 6-6" }],
      ["path", { d: "m16 16 4 4" }],
      ["path", { d: "m19 5-4 4" }],
      ["path", { d: "m14 4 6 6" }],
    ],
    shield: [
      ["path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" }],
    ],
  };

  for (const [tag, attrs] of paths[kind] ?? []) {
    const node = document.createElementNS(namespace, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.appendChild(node);
  }
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

function makeStat(kind, value, label) {
  const wrapper = document.createElement("span");
  wrapper.appendChild(svgIcon(kind));

  const strong = document.createElement("b");
  strong.textContent = value === null ? "—" : String(value);
  wrapper.appendChild(strong);

  const small = document.createElement("small");
  small.textContent = label;
  wrapper.appendChild(small);
  return wrapper;
}

function enableParallax(cardNode) {
  let box = null;
  let frame = null;
  let point = null;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const capable = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 761px)");

  function commit() {
    frame = null;
    if (!box || !point) return;
    const x = Math.min(1, Math.max(0, (point.x - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (point.y - box.top) / box.height));

    cardNode.style.setProperty("--mx", (x * 100).toFixed(2) + "%");
    cardNode.style.setProperty("--my", (y * 100).toFixed(2) + "%");
    cardNode.style.setProperty("--rx", ((0.5 - y) * 9 * 0.52).toFixed(2) + "deg");
    cardNode.style.setProperty("--ry", ((x - 0.5) * 11 * 0.52).toFixed(2) + "deg");
    cardNode.style.setProperty("--art-x", ((0.5 - x) * 7 * 0.52).toFixed(2) + "px");
    cardNode.style.setProperty("--art-y", ((0.5 - y) * 7 * 0.52).toFixed(2) + "px");
  }

  cardNode.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse" || reduced.matches || !capable.matches) return;
    box = cardNode.getBoundingClientRect();
    cardNode.dataset.tilt = "active";
  });

  cardNode.addEventListener("pointermove", (event) => {
    if (!box) return;
    point = { x: event.clientX, y: event.clientY };
    if (frame === null) frame = requestAnimationFrame(commit);
  });

  function reset() {
    box = null;
    point = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    delete cardNode.dataset.tilt;
    cardNode.style.setProperty("--mx", "50%");
    cardNode.style.setProperty("--my", "50%");
    cardNode.style.setProperty("--rx", "0deg");
    cardNode.style.setProperty("--ry", "0deg");
    cardNode.style.setProperty("--art-x", "0px");
    cardNode.style.setProperty("--art-y", "0px");
  }

  cardNode.addEventListener("pointerleave", reset);
  cardNode.addEventListener("pointercancel", reset);
}

function createCard(card) {
  const visual = getVisualData(card);
  const shell = document.createElement("div");
  shell.className = "card-shell";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "wiki-card";
  button.dataset.rarity = visual.rarity;
  button.dataset.cardEffect = "catalog";
  button.dataset.instanceId = text(card.instanceId, "");
  button.dataset.selected = String(card.instanceId === selectedInstanceId);
  button.setAttribute("aria-label", `Inspect ${text(card.definition?.presentation?.title, "card")}`);
  button.addEventListener("click", () => selectCard(card.instanceId));

  const holo = document.createElement("span");
  holo.className = "card-holo";
  holo.setAttribute("aria-hidden", "true");

  const grain = document.createElement("span");
  grain.className = "card-grain";
  grain.setAttribute("aria-hidden", "true");

  const frame = document.createElement("div");
  frame.className = "card-frame";

  const topline = document.createElement("div");
  topline.className = "card-topline";

  const rarity = document.createElement("span");
  rarity.className = "rarity-pill";
  rarity.appendChild(svgIcon("sparkles"));
  const rarityText = document.createElement("span");
  rarityText.textContent = rarityLabels[visual.rarity] ?? visual.rarity;
  rarity.appendChild(rarityText);

  const power = document.createElement("span");
  power.className = "power-chip";
  power.textContent = "PWR " + (visual.power ?? "—");

  topline.append(rarity, power);

  const art = document.createElement("div");
  art.className = "card-art";

  const fallback = document.createElement("div");
  fallback.className = "card-art-fallback";
  const fallbackLetter = document.createElement("span");
  fallbackLetter.textContent = "W";
  fallback.appendChild(fallbackLetter);
  art.appendChild(fallback);

  const imageUrl = safeHttpUrl(card.definition?.presentation?.imageUrl);
  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = text(card.definition?.presentation?.title, "Card artwork");
    img.loading = "lazy";
    img.decoding = "async";
    img.fetchPriority = "low";
    img.addEventListener("load", () => {
      fallback.hidden = true;
    });
    img.addEventListener("error", () => {
      img.remove();
      fallback.hidden = false;
    });
    art.appendChild(img);
  }

  const vignette = document.createElement("div");
  vignette.className = "card-art-vignette";
  art.appendChild(vignette);

  const copy = document.createElement("div");
  copy.className = "card-copy";
  const title = document.createElement("h3");
  title.textContent = text(card.definition?.presentation?.title, "Untitled card");
  const description = document.createElement("p");
  description.textContent = text(card.definition?.presentation?.description, "Portable collection card");

  const stats = document.createElement("div");
  stats.className = "card-stats";
  stats.append(
    makeStat("swords", visual.attack, "ATK"),
    makeStat("shield", visual.defense, "DEF"),
  );

  copy.append(title, description, stats);
  frame.append(topline, art, copy);
  button.append(holo, grain, frame);

  const meta = document.createElement("div");
  meta.className = "card-instance-meta";
  const serial = document.createElement("span");
  serial.textContent = "#" + text(card.serialNumber);
  const canonical = document.createElement("span");
  canonical.textContent = text(card.definition?.canonicalId);
  meta.append(serial, canonical);

  shell.append(button, meta);
  enableParallax(button);
  return shell;
}

function inspectorRow(label, value, href = null) {
  const row = document.createElement("div");
  row.className = "inspector-row";

  const heading = document.createElement("span");
  heading.textContent = label;
  row.appendChild(heading);

  if (href) {
    const link = document.createElement("a");
    link.target = "_blank";
    link.rel = "noreferrer";
    const safe = safeHttpUrl(href);
    link.textContent = text(value);
    if (safe) link.href = safe;
    row.appendChild(link);
  } else {
    const code = document.createElement("code");
    code.textContent = text(value);
    row.appendChild(code);
  }
  return row;
}

function renderInspector(card) {
  refs.inspector.replaceChildren();

  const title = document.createElement("h3");
  title.className = "inspector-title";
  title.textContent = text(card.definition?.presentation?.title, "Untitled card");

  const subtitle = document.createElement("p");
  subtitle.className = "inspector-subtitle";
  subtitle.textContent = `Instance #${text(card.serialNumber)} · minted ${formatDate(card.mintedAt)}`;

  const list = document.createElement("div");
  list.className = "inspector-list";
  list.append(
    inspectorRow("Instance ID", card.instanceId),
    inspectorRow("Canonical ID", card.definition?.canonicalId),
    inspectorRow("Wikidata ID", card.definition?.wikidataId),
    inspectorRow("Source provider", card.definition?.source?.provider),
    inspectorRow("Wikipedia language", card.definition?.source?.language),
    inspectorRow("Wikipedia page ID", card.definition?.source?.pageId),
    inspectorRow("Source URL", card.definition?.source?.url, card.definition?.source?.url),
  );

  const extensions = document.createElement("div");
  extensions.className = "inspector-extensions";
  const extensionTitle = document.createElement("span");
  extensionTitle.textContent = "Extensions";
  const extensionJson = document.createElement("pre");
  extensionJson.textContent = JSON.stringify(card.extensions ?? {}, null, 2);
  extensions.append(extensionTitle, extensionJson);

  refs.inspector.append(title, subtitle, list, extensions);
}

function selectCard(instanceId) {
  selectedInstanceId = instanceId;
  const card = cardByInstanceId.get(instanceId);
  for (const node of refs.cardsSpacer.querySelectorAll(".wiki-card")) {
    node.dataset.selected = String(node.dataset.instanceId === instanceId);
  }
  if (card) renderInspector(card);
}

function computeLayout() {
  const width = Math.max(1, refs.cardsViewport.clientWidth - 20);
  const mobile = width < 620;
  const gap = mobile ? 10 : 18;
  const minCardWidth = mobile ? MOBILE_MIN_CARD_WIDTH : DESKTOP_MIN_CARD_WIDTH;
  const columns = Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)));
  const cardWidth = (width - Math.max(0, columns - 1) * gap) / columns;
  const metaHeight = width <= 400 ? 0 : 26;
  const cardHeight = cardWidth / 0.715;
  const rowContentHeight = Math.ceil(cardHeight + metaHeight);
  const rowHeight = Math.ceil(rowContentHeight + gap);

  return { columns, gap, rowHeight, rowContentHeight };
}

function totalCards() {
  return currentExport?.payload?.collection?.cards?.length ?? 0;
}

function loadedRows() {
  return Math.ceil(loadedCardCount / layout.columns);
}

function destroyVirtualizer() {
  if (virtualizerCleanup) virtualizerCleanup();
  virtualizerCleanup = null;
  virtualizer = null;
  if (renderFrame !== null) cancelAnimationFrame(renderFrame);
  if (loadFrame !== null) cancelAnimationFrame(loadFrame);
  renderFrame = null;
  loadFrame = null;
}

function scheduleVirtualRender() {
  if (renderFrame !== null) return;
  renderFrame = requestAnimationFrame(() => {
    renderFrame = null;
    renderVirtualRows();
  });
}

function syncVirtualizerCount() {
  if (!virtualizer) return;
  virtualizer.setOptions({
    ...virtualizer.options,
    count: loadedRows(),
    estimateSize: () => layout.rowHeight,
  });
  virtualizer._willUpdate();
  scheduleVirtualRender();
}

function mountVirtualizer({ resetScroll = false } = {}) {
  destroyVirtualizer();
  layout = computeLayout();

  if (resetScroll) refs.cardsViewport.scrollTop = 0;

  virtualizer = new Virtualizer({
    count: loadedRows(),
    getScrollElement: () => refs.cardsViewport,
    estimateSize: () => layout.rowHeight,
    overscan: OVERSCAN_ROWS,
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    onChange: () => scheduleVirtualRender(),
  });

  virtualizerCleanup = virtualizer._didMount();
  virtualizer._willUpdate();
  scheduleVirtualRender();
}

function maybeLoadMore(virtualItems) {
  const total = totalCards();
  if (loadedCardCount >= total || virtualItems.length === 0 || loadFrame !== null) return;

  const lastRow = virtualItems[virtualItems.length - 1];
  if (lastRow.index < loadedRows() - 3) return;

  loadFrame = requestAnimationFrame(() => {
    loadFrame = null;
    loadedCardCount = Math.min(total, loadedCardCount + PAGE_SIZE);
    syncVirtualizerCount();
  });
}

function updateVirtualStatus(renderedCards) {
  const total = totalCards();
  const loaded = Math.min(loadedCardCount, total);
  const suffix = loaded < total ? " · loads more near the end" : " · all data available";
  refs.virtualStatus.textContent =
    `${loaded.toLocaleString()} / ${total.toLocaleString()} cards staged · ${renderedCards} cards in DOM${suffix}`;
}

function renderVirtualRows() {
  if (!virtualizer) return;

  const items = virtualizer.getVirtualItems();
  const totalSize = Math.max(virtualizer.getTotalSize(), refs.cardsViewport.clientHeight);
  refs.cardsSpacer.style.height = totalSize + "px";

  const cards = currentExport?.payload?.collection?.cards ?? [];
  const fragment = document.createDocumentFragment();
  let renderedCards = 0;

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "virtual-row";
    row.dataset.index = String(item.index);
    row.style.transform = `translateY(${item.start}px)`;
    row.style.height = layout.rowContentHeight + "px";
    row.style.setProperty("--virtual-columns", String(layout.columns));
    row.style.setProperty("--virtual-gap", layout.gap + "px");

    const start = item.index * layout.columns;
    const end = Math.min(start + layout.columns, loadedCardCount, cards.length);

    for (let index = start; index < end; index += 1) {
      row.appendChild(createCard(cards[index]));
      renderedCards += 1;
    }

    fragment.appendChild(row);
  }

  refs.cardsSpacer.replaceChildren(fragment);
  updateVirtualStatus(renderedCards);
  maybeLoadMore(items);
}

function setupResizeObserver() {
  resizeObserver?.disconnect();
  let resizeFrame = null;

  resizeObserver = new ResizeObserver(() => {
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      const next = computeLayout();
      const changed =
        next.columns !== layout.columns ||
        Math.abs(next.rowHeight - layout.rowHeight) > 1;

      if (!changed) return;

      layout = next;
      if (virtualizer) {
        virtualizer.setOptions({
          ...virtualizer.options,
          count: loadedRows(),
          estimateSize: () => layout.rowHeight,
        });
        virtualizer._willUpdate();
        virtualizer.measure();
      }
      scheduleVirtualRender();
    });
  });

  resizeObserver.observe(refs.cardsViewport);
}

function renderEmptyInspector() {
  selectedInstanceId = null;
  refs.inspector.replaceChildren();
  const empty = document.createElement("div");
  empty.className = "inspector-empty";
  const strong = document.createElement("strong");
  strong.textContent = "Empty collection";
  const paragraph = document.createElement("p");
  paragraph.textContent = "This snapshot does not contain any cards.";
  empty.append(strong, paragraph);
  refs.inspector.appendChild(empty);
}

function renderCards(exported) {
  const cards = exported.payload.collection.cards;
  cardByInstanceId = new Map(cards.map((card) => [card.instanceId, card]));
  loadedCardCount = Math.min(cards.length, PAGE_SIZE);
  refs.cardsSpacer.replaceChildren();

  if (cards.length === 0) {
    destroyVirtualizer();
    refs.cardsSpacer.style.height = "100%";
    updateVirtualStatus(0);
    renderEmptyInspector();
    return;
  }

  const selection = cards.some((card) => card.instanceId === selectedInstanceId)
    ? selectedInstanceId
    : cards[0].instanceId;
  selectCard(selection);

  mountVirtualizer({ resetScroll: true });
}

function renderRawJsonIfNeeded() {
  if (!refs.rawPanel.open || !currentExport || rawRenderedRevision === exportRevision) return;
  refs.rawJson.textContent = JSON.stringify(currentExport, null, 2);
  rawRenderedRevision = exportRevision;
}

function render(exported, sourceLabel) {
  currentExport = validateEnvelope(exported);
  exportRevision += 1;
  rawRenderedRevision = -1;
  refs.rawJson.textContent = "";
  refs.error.hidden = true;
  refs.sourceLabel.textContent = sourceLabel;
  setSummary(currentExport);
  renderCards(currentExport);
  renderRawJsonIfNeeded();
  requestAnimationFrame(notifyHostHeight);
}

async function loadDemo() {
  try {
    const response = await fetch("./sample-export.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load the bundled demo export.");
    selectedInstanceId = null;
    render(await response.json(), "Bundled demo export");
  } catch (error) {
    showError(error);
  }
}

function showError(error) {
  refs.error.textContent = error instanceof Error ? error.message : "Unable to display this export.";
  refs.error.hidden = false;
}

refs.fileInput.addEventListener("change", async () => {
  const file = refs.fileInput.files?.[0];
  if (!file) return;

  try {
    if (file.size > 16 * 1024 * 1024) throw new Error("The viewer limits local files to 16 MiB.");
    const parsed = JSON.parse(await file.text());
    selectedInstanceId = null;
    render(parsed, `Local file · ${file.name}`);
  } catch (error) {
    showError(error);
  } finally {
    refs.fileInput.value = "";
  }
});

refs.resetDemo.addEventListener("click", () => {
  selectedInstanceId = null;
  void loadDemo();
});

refs.rawPanel.addEventListener("toggle", () => {
  renderRawJsonIfNeeded();
  requestAnimationFrame(notifyHostHeight);
});

window.addEventListener("beforeunload", () => {
  resizeObserver?.disconnect();
  hostResizeObserver?.disconnect();
  destroyVirtualizer();
});

hostResizeObserver = new ResizeObserver(() => notifyHostHeight());
hostResizeObserver.observe(document.documentElement);
window.addEventListener("load", notifyHostHeight);
window.addEventListener("resize", notifyHostHeight);

setupResizeObserver();
void loadDemo();
