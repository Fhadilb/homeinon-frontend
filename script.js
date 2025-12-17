console.log("🔥 script.js IS RUNNING v2007");
// FREE IN-BROWSER AI — WebLLM (Llama 3.1 8B)
let webllmModel = null;

async function loadWebLLM() {
  console.log("🔥 loadWebLLM CALLED");

  if (webllmModel) {
    console.log("🔥 Already loaded →", webllmModel);
    return webllmModel;
  }

  if (!window.webllm) {
    console.error("❌ WebLLM not found on window");
    return null;
  }

  // 🔒 ADD THIS BLOCK RIGHT HERE
  if (!window.webllm?.prebuiltAppConfig) {
    console.warn("⏳ WebLLM config not ready yet");
    return null;
  }

  try {
    console.log("⏳ Creating MLC Engine…");

    webllmModel = await window.webllm.CreateMLCEngine(
      "Llama-3.2-1B-Instruct-q4f16_1-MLC",
      {
        model_id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
        useIndexedDBCache: false
      }
    );

    console.log("🚀 WebLLM LOADED:", webllmModel);
    return webllmModel;

  } catch (err) {
    console.error("❌ WebLLM init FAILED:", err);
    return null;
  }
}

async function aiClassify(query) {
  const model = await loadWebLLM();
  if (!model) {
    console.error("Model not loaded - cannot classify");
    return { categories: [], room: null };
  }

const prompt = `
Extract product categories and room intent from the user query.

Valid categories (ONLY choose from these):
bed, wardrobe, drawers, dressing table, bedside table,
sofa, armchair, coffee table, side table, tv unit, bookcase, cabinet,
dining table, dining chair, bench, desk, office chair, sideboard,
mirror, wall mirror, floor mirror,
rug, carpet,
lighting, lamp, floor lamp, table lamp,
wall art, artwork, picture, decor.

Rules:
- If the user mentions "mirror", NEVER return sofa or table
- If decor is mentioned, prefer decor categories over furniture
- Return up to 6 relevant categories
- Infer room if obvious (bedroom, living, dining, office)

User query: "${query}"

Return ONLY valid JSON:
{
  "categories": ["wall mirror", "bedside table"],
  "room": "bedroom"
}
`;


  try {
    const response = await model.chat.completions.create({
      messages: [{ role: "user", content: prompt }]
    });

    const text = response?.choices?.[0]?.message?.content?.trim() || "";
    return JSON.parse(text);

  } catch (err) {
    console.error("AI classify error:", err);
    return { categories: [], room: null };
  }
}



const API_URL = "https://homeinon-backend.onrender.com/products";
const STYLE_IMAGES = {
  "contemporary": "assets/style-contemporary.jpg",
  "scandinavian": "assets/style-scandinavian.jpg",
  "transitional": "assets/style-mid-century-modern.jpg",
  "mid century modern": "assets/style-mid-century-modern.jpg",
  "traditional": "assets/style-traditional.jpg",
  "minimalism": "assets/style-minimalism.jpg",
  "art deco": "assets/style-art-deco.jpg",
  "bohemian": "assets/style-bohemian.jpg",
  "coastal": "assets/style-coastal.jpg",
  "japandi": "assets/style-japandi.jpg",
  "country": "assets/style-country.jpg",
  "maximalism": "assets/style-maximalism.jpg",
  "regency": "assets/style-regency.jpg"
};
const ROOM_IMAGES = {
  "bedroom": "assets/room-bedroom.jpg",
  "dining": "assets/room-dining.jpg",
  "living": "assets/room-living.jpg",
  "office": "assets/room-office.jpg"
};
const colourMap = {
  white:"#ffffff", black:"#000000", grey:"#9e9e9e", gray:"#9e9e9e",
  oak:"#c49a6c", walnut:"#7a5734", pine:"#d5b887", beige:"#d9c7a2",
  gold:"#c8a951", silver:"#bdbdbd", blue:"#5a7abf", green:"#6aa67a",
  red:"#c74c4c", brown:"#8b5a2b", cream:"#f3e9d2", yellow:"#f8e473",
  ivory:"#fffff0", natural:"#d6b98c", charcoal:"#36454f", teal:"#367588",
  taupe:"#b38b6d", stone:"#c2b59b", pink:"#f7c6d9", orange:"#f6a04d",
  navy:"#001f3f", mink:"#b7a295", copper:"#b87333", bronze:"#cd7f32",
  lilac:"#c8a2c8", sage:"#a9bfa5", mustard:"#e1ad01", terracotta:"#e2725b",
  pewter:"#8e9292"
};
const colourHex = n => colourMap[String(n||"").toLowerCase()] || "#ccc";

function getImage(p) {
  const candidates = [
    p.image_url, p.imageUrl, p.Image_URL, p["image-url"],
    p["image_url "], p[" image_url"], p["Image Url"], p.image,
    p.img, p.picture, p.photo, p.images && p.images[0]
  ];
  for (let c of candidates) {
    if (c && typeof c === "string" && c.trim() !== "") return c.trim();
  }
  return "https://placehold.co/340x240?text=No+Image";
}

function deriveStyle(txt=""){
  const t = String(txt).toLowerCase();
  if(t.includes("boho")) return "Boho";
  if(t.includes("industrial")||t.includes("metal")) return "Industrial";
  if(t.includes("scandi")||t.includes("nordic")) return "Scandi";
  if(t.includes("farmhouse")||t.includes("rustic")) return "Farmhouse";
  if(t.includes("mid")||t.includes("retro")) return "Mid-century";
  if(t.includes("art deco")||t.includes("glam")) return "Art Deco";
  if(t.includes("coastal")||t.includes("beach")) return "Coastal";
  return "Modern";
}

function formatDims(p) {
  const rawW = p.width_cm ?? p.width ?? "";
  const rawD = p.depth_cm ?? p.depth ?? "";
  const rawH = p.height_cm ?? p.height ?? "";
  const normalize = (val) => {
    const s = (val || "").toString().trim();
    if (!s) return "";
    const num = s.replace(/cm/gi, "").trim();
    if (!num) return "";
    return `${num}cm`;
  };
  const w = normalize(rawW);
  const d = normalize(rawD);
  const h = normalize(rawH);
  const parts = [];
  if (w) parts.push(`W${w}`);
  if (d) parts.push(`D${d}`);
  if (h) parts.push(`H${h}`);
  let out = parts.join(" x ");
  out = out.replace(/cm\s*cm/gi, "cm");
  return out;
}

function normalizeCutoutPath(p) {
  if (!p) return "";
  const s = String(p).trim();
  const m = s.match(/([^\/]+\.png)$/i);
  const file = m ? m[1] : s.replace(/^.*[\/]/, "");
  return file ? `assets/Cutouts/${file}` : "";
}
// --------- AI CATEGORY EXPANSION (STEP 3A) ----------
function expandCategories(categories = [], room) {
  const roomDefaults = {
    bedroom: ["bed", "bedside table", "wardrobe", "mirror", "lighting"],
    living: ["sofa", "coffee table", "tv unit", "rug", "lighting", "decor"],
    dining: ["dining table", "dining chair", "sideboard", "lighting"],
    office: ["desk", "office chair", "bookcase", "lighting"]
  };

  const defaults = roomDefaults[room] || [];
  const set = new Set([...categories, ...defaults]);

  return Array.from(set).slice(0, 6);
}
// --------- AI KEYWORD OVERRIDES ----------
function keywordOverrideCategories(query = "") {
  const q = query.toLowerCase();

  // Office intent should strongly force office categories
  if (q.includes("office")) return ["desk", "office chair", "bookcase"];

  // Desk intent should strongly force desk categories
  if (q.includes("desk")) return ["desk", "office chair"];

  if (q.includes("mirror")) return ["mirror"];
  if (q.includes("rug") || q.includes("carpet")) return ["rug"];
  if (q.includes("lamp") || q.includes("light")) return ["lighting"];
  if (q.includes("wardrobe")) return ["wardrobe"];
  if (q.includes("bed")) return ["bed"];

  return null;
}

// --------- EXPLICIT ROOM OVERRIDES ----------
function extractExplicitRoom(query = "") {
  const q = query.toLowerCase();

  if (q.includes("office")) return "office";
  if (q.includes("bedroom")) return "bedroom";
  if (q.includes("living")) return "living";
  if (q.includes("dining")) return "dining";

  return null;
}

// --------- STEP 3A — EXTRACT PRICE INTENT ----------
function extractMaxPrice(query = "") {
  const q = query.toLowerCase();

  let m = q.match(/(under|below|less than)\s*£?\s*(\d+)/);
  if (m) return parseFloat(m[2]);

  m = q.match(/(max|up to)\s*£?\s*(\d+)/);
  if (m) return parseFloat(m[2]);

  m = q.match(/£\s*(\d+)/);
  if (m) return parseFloat(m[1]);

  return null;
}


function extractExplicitRoom(query = "") {
  const q = query.toLowerCase();

  if (q.includes("office")) return "office";
  if (q.includes("bedroom")) return "bedroom";
  if (q.includes("living")) return "living";
  if (q.includes("dining")) return "dining";

  return null;
}

// --------- STEP 9 — NORMALISED RELEVANCE SCORING ----------
function scoreProduct(product, query, categories, room) {
  let score = 0;

  const q = (query || "").toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 2);

  const title = (product.title || "").toLowerCase();
  const desc  = (product.description || "").toLowerCase();
  const cat   = (product.category || "").toLowerCase();
  const prodRoom = (product.room || "").toLowerCase();

  // 1️⃣ HARD CATEGORY MATCH (dominant)
  if (categories.includes(product.category)) score += 120;

  // 2️⃣ WORD-LEVEL MATCHING (very important)
  words.forEach(w => {
    if (cat.includes(w))   score += 50;
    if (title.includes(w)) score += 40;
    if (desc.includes(w))  score += 20;
  });

  // 3️⃣ ROOM RELEVANCE (strong)
  if (room && prodRoom === room) score += 35;
  if (room && prodRoom && prodRoom !== room) score -= 80;

  // 4️⃣ HARD INTENT GUARDS (kill bad matches EARLY)
  if (words.includes("mirror") && ["sofa", "bed", "desk", "table"].includes(product.category)) {
    score -= 300;
  }

  if (words.includes("office") && ["bed", "wardrobe", "bedside table", "drawers"].includes(product.category)) {
    score -= 300;
  }

  if (words.includes("desk") || words.includes("office")) {
    const allowed = ["desk", "office chair", "bookcase", "cabinet"];
    if (!allowed.includes(product.category)) score -= 200;
  }

  // 5️⃣ NOISE FLOOR — kill weak matches LAST
  if (score < 40) return 0;

  return score;
}


// --------- STATE ---------
let allProducts = [];
let selectedStyle = "";
let selectedRoom = "";
let selectedColour = "";
let showFavourites = false;
let favourites = JSON.parse(localStorage.getItem("favourites")||"[]");
let roomset = JSON.parse(localStorage.getItem("roomset") || "[]");
let floorplanFeatures = JSON.parse(localStorage.getItem("floorplanFeatures") || "[]");
let addFeatureMode = null;
let currentScalePxPerM = 60;
let isFloorplanMode = false;  // Track floorplan mode
let canvasMode = false;

// =======================================================
// 🧱 FLOORPLAN BUILDER — WALL DRAWING (A2 + A3 GRID SNAP)
// =======================================================

// --------- GRID CONFIG ----------
const GRID_SIZE_PX = 20;        // one grid square
const SNAP_DISTANCE_PX = 40;    // endpoint snap radius
const METERS_PER_GRID = 0.5; // 20px grid = 0.5m (so 40px = 1m)
const DOOR_WIDTH_PX = GRID_SIZE_PX * 2;    // 1m
const WINDOW_WIDTH_PX = GRID_SIZE_PX * 1.5; // 0.75m

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE_PX) * GRID_SIZE_PX;
}

// Axis + grid snapping (Shift = free angle)
function getSnappedEndPoint(rawX, rawY, start, shiftKey) {
  let x = snapToGrid(rawX);
  let y = snapToGrid(rawY);

  // Shift = free angle
  if (shiftKey || !start) {
    return { x, y };
  }

  const dx = Math.abs(x - start.x);
  const dy = Math.abs(y - start.y);

  // lock to closest axis
  if (dx < dy) {
    x = start.x;
  } else {
    y = start.y;
  }

  return { x, y };
}

// --------- ENDPOINT SNAP HELPERS ----------
function getAllWallEndpoints() {
  const points = [];
  walls.forEach(w => {
    points.push({ x: w.x1, y: w.y1 });
    points.push({ x: w.x2, y: w.y2 });
  });
  return points;
}

function snapToNearbyEndpoint(point) {
  const endpoints = getAllWallEndpoints();

  let closest = null;
  let minDist = SNAP_DISTANCE_PX;

  endpoints.forEach(p => {
    const dx = p.x - point.x;
    const dy = p.y - point.y;
    const dist = Math.hypot(dx, dy);

    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  });

  return closest ? { x: closest.x, y: closest.y } : point;
}

// --------- GRID LABELS ----------
function drawGridLabels() {
  if (!ctx) return;

  ctx.save();
  ctx.fillStyle = "#64748b";
  ctx.font = "12px sans-serif";

  const width = builderCanvas.width;
  const height = builderCanvas.height;

  const meterStepPx = GRID_SIZE_PX * 2; // 40px = 1m

  // X axis labels (top)
  for (let x = 0; x <= width; x += meterStepPx) {
    const meters = (x / meterStepPx).toFixed(0);
    ctx.fillText(`${meters} m`, x + 4, 14);
  }

  // Y axis labels (left)
  for (let y = 0; y <= height; y += meterStepPx) {
    const meters = (y / meterStepPx).toFixed(0);
    ctx.fillText(`${meters} m`, 4, y - 4);
  }

  ctx.restore();
}
function getDistanceMeters(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const distancePx = Math.hypot(dx, dy);

  // 40px = 1 meter
  return distancePx / (GRID_SIZE_PX * 2);
}
function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // wall is a point
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  const closestX = x1 + clampedT * dx;
  const closestY = y1 + clampedT * dy;

  return Math.hypot(px - closestX, py - closestY);
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return { x: x1, y: y1, t: 0 };
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  return {
    x: x1 + clampedT * dx,
    y: y1 + clampedT * dy,
    t: clampedT
  };
}
function isPointNearDoor(px, py, door) {
  const half = door.width / 2;

  const x1 = door.center.x - door.ux * half;
  const y1 = door.center.y - door.uy * half;
  const x2 = door.center.x + door.ux * half;
  const y2 = door.center.y + door.uy * half;

  // Increased tolerance for reliable clicking
  const HIT_TOLERANCE_PX = 14;

  const dist = distancePointToSegment(px, py, x1, y1, x2, y2);
  return dist <= HIT_TOLERANCE_PX;
}


function getWallMidpointAndNormal(wall) {
  const mx = (wall.x1 + wall.x2) / 2;
  const my = (wall.y1 + wall.y2) / 2;

  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.hypot(dx, dy) || 1;

  return {
    mx,
    my,
    ux: dx / length,
    uy: dy / length
  };
}


// --------- BACKGROUND GRID ----------
function drawBackgroundGrid() {
  if (!ctx) return;

  const width = builderCanvas.width;
  const height = builderCanvas.height;

  ctx.save();
  ctx.strokeStyle = "#e5e7eb"; // light gray grid
  ctx.lineWidth = 1;

  // vertical grid lines
  for (let x = 0; x <= width; x += GRID_SIZE_PX) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // horizontal grid lines
  for (let y = 0; y <= height; y += GRID_SIZE_PX) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

// --------- CANVAS STATE ----------
const builderCanvas = document.getElementById("floorplanBuilder");
const builderWrap   = document.getElementById("floorplanBuilderWrap");
// --------- BUILDER CONTROLS ----------
let builderControls = document.getElementById("builderControls");
let builderFooter = document.getElementById("builderFooter");

if (builderWrap && !builderFooter) {
  builderFooter = document.createElement("div");
  builderFooter.id = "builderFooter";
  builderFooter.style.display = "flex";
builderFooter.style.justifyContent = "space-between";
builderFooter.style.alignItems = "center";
builderFooter.style.padding = "12px 0";
builderFooter.style.marginTop = "8px";
builderWrap.parentElement.appendChild(builderFooter);
}

if (!builderControls && builderFooter) {
  builderControls = document.createElement("div");
  builderControls.id = "builderControls";

  // IMPORTANT: no absolute positioning anymore
  builderControls.style.display = "flex";
  builderControls.style.gap = "8px";
  builderControls.style.background = "transparent";
  builderControls.style.padding = "0";
  builderControls.style.boxShadow = "none";

  builderControls.innerHTML = `
    <button id="drawWallBtn" class="builder-btn active">Wall</button>
    <button id="placeDoorBtn" class="builder-btn">Door</button>
    <button id="placeWindowBtn" class="builder-btn">Window</button>
  `;

  builderFooter.appendChild(builderControls);
}

// --------- BUILDER MODE BUTTONS ----------
const drawWallBtn   = document.getElementById("drawWallBtn");
const placeDoorBtn  = document.getElementById("placeDoorBtn");
const placeWindowBtn = document.getElementById("placeWindowBtn");

function setBuilderMode(newMode) {
  mode = newMode;

  // reset active states
  drawWallBtn.classList.remove("active");
  placeDoorBtn.classList.remove("active");
  placeWindowBtn.classList.remove("active");

  // activate correct button
  if (mode === "draw-wall") drawWallBtn.classList.add("active");
  if (mode === "place-door") placeDoorBtn.classList.add("active");
  if (mode === "place-window") placeWindowBtn.classList.add("active");
}

drawWallBtn.addEventListener("click", () => {
  setBuilderMode("draw-wall");
});

placeDoorBtn.addEventListener("click", () => {
  setBuilderMode("place-door");
});

placeWindowBtn.addEventListener("click", () => {
  setBuilderMode("place-window");
});

let ctx = null;
let walls = [];
let drawing = false;
let startPoint = null;
let currentMouse = { x: 0, y: 0 };
let snapCandidate = null;
let mode = "draw-wall"; // "draw-wall" | "place-door" | "place-window"
let openings = []; // doors & windows
let hoveredWallIndex = null;

// --------- RESIZE ----------
function resizeBuilderCanvas() {
  if (!builderCanvas) return;

  const rect = builderCanvas.getBoundingClientRect();
  builderCanvas.width  = rect.width;
  builderCanvas.height = rect.height;

  redrawWalls();
}

// --------- DRAW ----------
function redrawWalls() {
  if (!ctx) return;

  ctx.clearRect(0, 0, builderCanvas.width, builderCanvas.height);

  drawBackgroundGrid();
  drawGridLabels();

  // --------- SOLID WALLS ----------
  ctx.setLineDash([]);

  walls.forEach((w, index) => {
    const isHovered =
      hoveredWallIndex === index && mode !== "draw-wall";

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w.x1, w.y1);
    ctx.lineTo(w.x2, w.y2);

    ctx.lineWidth = isHovered ? 6 : 4;
    ctx.strokeStyle = isHovered ? "#22c55e" : "#1e40af";
    ctx.stroke();
    ctx.restore();

    // ---- persistent dimension label ----
    if (w.length != null) {
      const midX = (w.x1 + w.x2) / 2;
      const midY = (w.y1 + w.y2) / 2;

      ctx.save();
      ctx.fillStyle = "#0f172a";
      ctx.font = "12px sans-serif";
      ctx.fillText(`${w.length.toFixed(2)} m`, midX + 6, midY - 6);
      ctx.restore();
    }
  });

// --------- DRAW PLACED DOORS / WINDOWS ----------
openings.forEach(o => {
  const half = o.width / 2;

  // ---- draw opening gap ----
  ctx.save();
  ctx.strokeStyle = o.type === "door" ? "#16a34a" : "#0284c7";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(
    o.center.x - o.ux * half,
    o.center.y - o.uy * half
  );
  ctx.lineTo(
    o.center.x + o.ux * half,
    o.center.y + o.uy * half
  );
  ctx.stroke();
  ctx.restore();

// ---- door swing arc (normal-based, correct) ----
if (o.type === "door") {
  const half = o.width / 2;

  // hinge at one end of the opening
  const hingeX = o.center.x - o.ux * half;
  const hingeY = o.center.y - o.uy * half;

  // wall normal (perpendicular)
  const nx = -o.uy;
  const ny = o.ux;

  // choose side based on swing
  const dir = o.swing === "in" ? 1 : -1;

  // closed door direction (along wall)
  const closedAngle = Math.atan2(o.uy, o.ux);

  // open door direction (off the wall, across it)
  const openAngle = Math.atan2(
    o.uy + dir * ny,
    o.ux + dir * nx
  );

  ctx.save();
  ctx.strokeStyle = "#16a34a";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.arc(
    hingeX,
    hingeY,
    o.width,
    closedAngle,
    openAngle,
    dir < 0
  );
  ctx.stroke();

  ctx.restore();
}


});


  // --------- PREVIEW WALL (while drawing) ----------
  if (drawing && startPoint) {
    const end = currentMouse || startPoint;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#64748b";
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.restore();

    // ---- live dimension label ----
    const meters = getDistanceMeters(startPoint, end);
    const label = `${meters.toFixed(2)} m`;

    const midX = (startPoint.x + end.x) / 2;
    const midY = (startPoint.y + end.y) / 2;

    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.font = "12px sans-serif";
    ctx.fillText(label, midX + 6, midY - 6);
    ctx.restore();
  }

  // --------- SNAP INDICATOR ----------
  if (drawing && snapCandidate) {
    ctx.save();
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(snapCandidate.x, snapCandidate.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}


// --------- EVENTS ----------
if (builderCanvas) {
  ctx = builderCanvas.getContext("2d");

  // --------- MOUSE DOWN (start wall) ----------
  builderCanvas.addEventListener("mousedown", (e) => {
    if (mode !== "draw-wall") return;

    const rect = builderCanvas.getBoundingClientRect();
    drawing = true;

    startPoint = {
      x: snapToGrid(e.clientX - rect.left),
      y: snapToGrid(e.clientY - rect.top)
    };

    currentMouse = { ...startPoint };
    redrawWalls();
  });

  // --------- MOUSE MOVE ----------
  builderCanvas.addEventListener("mousemove", (e) => {
    const rect = builderCanvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // update mouse position
    if (drawing && startPoint) {
      currentMouse = getSnappedEndPoint(
        rawX,
        rawY,
        startPoint,
        e.shiftKey
      );
    } else {
      currentMouse = {
        x: snapToGrid(rawX),
        y: snapToGrid(rawY)
      };
    }

    // ---- ENDPOINT SNAP DETECTION ----
    snapCandidate = null;

    if (drawing && startPoint) {
      const snapped = snapToNearbyEndpoint(currentMouse);
      if (snapped.x !== currentMouse.x || snapped.y !== currentMouse.y) {
        snapCandidate = snapped;
      }
    }

    // ---- WALL HOVER DETECTION ----
    hoveredWallIndex = null;

    if (mode !== "draw-wall") {
      let minDist = 8;

      walls.forEach((w, index) => {
        const d = distancePointToSegment(
          currentMouse.x,
          currentMouse.y,
          w.x1,
          w.y1,
          w.x2,
          w.y2
        );

        if (d < minDist) {
          minDist = d;
          hoveredWallIndex = index;
        }
      });
    }

    redrawWalls();
  });

  // --------- MOUSE UP (finish wall) ----------
  builderCanvas.addEventListener("mouseup", (e) => {
    if (!drawing || mode !== "draw-wall") return;
    drawing = false;

    const rect = builderCanvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    let endPoint = getSnappedEndPoint(
      rawX,
      rawY,
      startPoint,
      e.shiftKey
    );

    endPoint = snapToNearbyEndpoint(endPoint);
    const snappedStart = snapToNearbyEndpoint(startPoint);

    const lengthMeters = getDistanceMeters(snappedStart, endPoint);

    walls.push({
      x1: snappedStart.x,
      y1: snappedStart.y,
      x2: endPoint.x,
      y2: endPoint.y,
      length: lengthMeters
    });

    startPoint = null;
    redrawWalls();
  });

// --------- CLICK (place door / window) ----------
builderCanvas.addEventListener("click", (e) => {
  if (mode === "draw-wall") return;

 const rect = builderCanvas.getBoundingClientRect();

const clickX = snapToGrid(e.clientX - rect.left);
const clickY = snapToGrid(e.clientY - rect.top);


  // ---- 1) TOGGLE EXISTING DOOR IF CLICKED ----
  for (let i = 0; i < openings.length; i++) {
    const o = openings[i];
    if (o.type !== "door") continue;

    if (isPointNearDoor(clickX, clickY, o)) {
      o.swing = o.swing === "in" ? "out" : "in";
      redrawWalls();
      return; // IMPORTANT: stop here
    }
  }

  // ---- 2) OTHERWISE PLACE NEW DOOR / WINDOW ----
  let clickedWallIndex = null;
  let minDist = 8;

  walls.forEach((w, index) => {
    const d = distancePointToSegment(
      clickX,
      clickY,
      w.x1,
      w.y1,
      w.x2,
      w.y2
    );

    if (d < minDist) {
      minDist = d;
      clickedWallIndex = index;
    }
  });

  if (clickedWallIndex === null) return;

  const wall = walls[clickedWallIndex];
  const { ux, uy } = getWallMidpointAndNormal(wall);

  const p = closestPointOnSegment(
    clickX,
    clickY,
    wall.x1,
    wall.y1,
    wall.x2,
    wall.y2
  );

  const width =
    mode === "place-door" ? DOOR_WIDTH_PX : WINDOW_WIDTH_PX;

  openings.push({
    type: mode === "place-door" ? "door" : "window",
    wallIndex: clickedWallIndex,
    center: {
      x: snapToGrid(p.x),
      y: snapToGrid(p.y)
    },
    ux,
    uy,
    width,
    swing: "in"
  });

  redrawWalls();
});


}




// --------- WALL DRAW FINISH ----------
builderCanvas.addEventListener("mouseup", (e) => {
  if (!drawing) return;
  drawing = false;

  const rect = builderCanvas.getBoundingClientRect();
  const rawX = e.clientX - rect.left;
  const rawY = e.clientY - rect.top;

  let endPoint = getSnappedEndPoint(
    rawX,
    rawY,
    startPoint,
    e.shiftKey
  );

  // snap both ends to nearby existing endpoints
  endPoint = snapToNearbyEndpoint(endPoint);
  const snappedStart = snapToNearbyEndpoint(startPoint);

  const lengthMeters = getDistanceMeters(snappedStart, endPoint);

  walls.push({
    x1: snappedStart.x,
    y1: snappedStart.y,
    x2: endPoint.x,
    y2: endPoint.y,
    length: lengthMeters
  });

  startPoint = null;
  redrawWalls();
});

// --------- FLOORPLAN / ROOMSET BACKGROUND ----------
function setBlueprintBackground(on) {
  if (!roomsetCanvas) return;

  if (on) {
    // Blueprint-style background for floorplan
    roomsetCanvas.style.backgroundImage =
      "repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 20px)," +
      "repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 20px)";
    roomsetCanvas.style.backgroundColor = "#ffffff";
  } else {
    // Clear background so room photo layer shows
    roomsetCanvas.style.backgroundImage = "";
    roomsetCanvas.style.backgroundColor = "";
  }
}

function productKey(p){
  return (p && (p.sku || p.SKU || p.id || p.ID || p.title || "")).toString();
}

function saveRoomset(){
  localStorage.setItem("roomset", JSON.stringify(roomset));
}

function inRoomset(key){
  return roomset.some(it => it.key === key);
}

function addToRoomset(p){
  const key = productKey(p);
  if(!key || inRoomset(key)) return;
  const item = {
    key, title: p.title || "", sku: p.sku || p.SKU || "", price: p.price || "",
    cutout_local_path: normalizeCutoutPath(p.cutout_local_path) || "",
    image_url: getImage(p), url: p.url || "", category: p.category || "",
    material: p.material || "", colour: p.colour || "", style: p.style || "",
    width_cm: p.width_cm ?? p.width ?? "", depth_cm: p.depth_cm ?? p.depth ?? "",
    height_cm: p.height_cm ?? p.height ?? "", x: 50, y: 50
  };
  roomset.push(item);
  saveRoomset();
}

function removeFromRoomset(key){
  roomset = roomset.filter(it => it.key !== key);
  saveRoomset();
}

function toggleRoomset(p){
  const key = productKey(p);
  if(!key) return;
  inRoomset(key) ? removeFromRoomset(key) : addToRoomset(p);
}

function getState(){
  return {
    q: document.getElementById("searchBox").value.toLowerCase(),
    category: document.getElementById("category").value,
    material: document.getElementById("material").value,
    colour: selectedColour,
    style: selectedStyle,
    room: selectedRoom,
    max: parseFloat(document.getElementById("priceRange").value) || Infinity
  };
}

function filterProducts(state, ignoreField){
  return allProducts.filter(p=>{
    const t = (p.title||"").toLowerCase();
    const d = (p.description||"").toLowerCase();
    const price = parseFloat(p.price)||0;
    const checks = {
      q: (!state.q) || t.includes(state.q) || d.includes(state.q),
      category: (!state.category) || (p.category && p.category.toLowerCase() === state.category.toLowerCase()),
      material: (!state.material) || (p.material && p.material.toLowerCase() === state.material.toLowerCase()),
      colour: (!state.colour) || (p.colour && p.colour.toLowerCase().includes(state.colour.toLowerCase())),
      style: (!state.style) || (p.style && p.style.toLowerCase() === state.style.toLowerCase()),
      room: (!state.room) || (p.room && p.room.toLowerCase() === state.room.toLowerCase()),
      max: price <= state.max
    };
    if(ignoreField) checks[ignoreField] = true;
    if(showFavourites) checks.fav = favourites.includes(p.title || p.sku || "");
    return Object.values(checks).every(Boolean);
  });
}

const uniqueValues = (arr, field)=>{
  const s = new Set();
  arr.forEach(p=>{
    const v = p[field]; if(!v) return;
    String(v).split(/[,/|;]/).forEach(x=> { const val = x.trim(); if(val) s.add(val); });
  });
  return [...s];
};

// ---------- UI BUILDERS ----------
function buildStyleCards(styles){
  const row = document.getElementById("styleSelector");
  row.innerHTML = "";
  styles.forEach(style=>{
    const card = document.createElement("div");
    card.className = "style-card";
    const imgSrc = STYLE_IMAGES[style.toLowerCase()] || `https://placehold.co/200x150?text=${encodeURIComponent(style)}`;
    card.innerHTML = `<img src="${imgSrc}" alt="${style}"><span>${style}</span>`;
    card.addEventListener("click", ()=>{
      document.querySelectorAll(".style-card").forEach(c=>c.classList.remove("active"));
      if(selectedStyle === style){ selectedStyle = ""; }
      else { selectedStyle = style; card.classList.add("active"); }
      updateFilterOptions(); applyFilters();
    });
    row.appendChild(card);
  });
}

function buildRoomCards(rooms) {
  const row = document.getElementById("roomSelector");
  row.innerHTML = "";
  rooms.forEach(room => {
    const card = document.createElement("div");
    card.className = "style-card";
    const imgSrc = ROOM_IMAGES[room.toLowerCase()] || `https://placehold.co/200x150?text=${encodeURIComponent(room)}`;
    card.innerHTML = `<img src="${imgSrc}" alt="${room}"><span>${room}</span>`;
    card.addEventListener("click", () => {
      document.querySelectorAll("#roomSelector .style-card").forEach(c => c.classList.remove("active"));
      if (selectedRoom === room) selectedRoom = "";
      else { selectedRoom = room; card.classList.add("active"); }
      updateFilterOptions(); applyFilters();
    });
    row.appendChild(card);
  });
}

function buildColourDropdown(colours, keepSelection=true){
  const select = document.getElementById("colourSelect");
  const list = document.getElementById("colourList");
  const prev = keepSelection ? selectedColour : "";
  list.innerHTML = "";
  const allItem = document.createElement("div");
  allItem.className = "colour-item"; allItem.textContent = "All";
  allItem.addEventListener("click", ()=>{ selectedColour = ""; select.textContent = "All"; list.classList.remove("active"); applyFilters(); });
  list.appendChild(allItem);
  colours.forEach(c=>{
    const item = document.createElement("div");
    item.className = "colour-item";
    item.innerHTML = `<span class="swatch" style="background:${colourHex(c)}"></span>${c}`;
    item.addEventListener("click", ()=>{ selectedColour = c; select.innerHTML = `<span class="swatch" style="background:${colourHex(c)}"></span>${c}`; list.classList.remove("active"); updateFilterOptions(); applyFilters(); });
    list.appendChild(item);
  });
  if(prev && colours.includes(prev)){
    selectedColour = prev;
    select.innerHTML = `<span class="swatch" style="background:${colourHex(prev)}"></span>${prev}`;
  } else { select.textContent = "All"; }
  select.onclick = ()=> list.classList.toggle("active");
  document.addEventListener("click", e=>{ if(!e.target.closest(".colour-dropdown")) list.classList.remove("active"); });
}

function renderProducts(products){
  const list = document.getElementById("product-list");
  const count = document.getElementById("product-count");
  list.innerHTML = "";
  count.textContent = `${products.length} product${products.length!==1?"s":""} found`;
  if(products.length === 0){
    list.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:80px 20px">
      <div style="font-size:4rem;margin-bottom:16px">${showFavourites ? '💔' : '🔍'}</div>
      <h3 style="color:var(--ink);margin-bottom:8px">${showFavourites ? 'No favourites yet' : 'No products found'}</h3>
      <p style="color:var(--muted)">${showFavourites ? 'Click the ❤️ on products you love!' : 'Try adjusting your filters'}</p>
    </div>`;
    return;
  }
  products.forEach((p, idx)=>{
    const price = parseFloat(p.price) || 0;
    const liked = favourites.includes(p.title || p.sku || "");
    const div = document.createElement("div");
    div.className = "product"; div.setAttribute("data-index", idx);
    div.innerHTML = `<div class="style-label">${p.style || ""}</div>
      <img src="${getImage(p)}" alt="${p.title}" />
      <div class="product-info"><h3>${p.title}</h3><p class="price">£${price.toFixed(2)}</p></div>
      <button class="heart-btn ${liked ? "liked":""}" title="Favourite" data-key="${p.title || p.sku || ""}">❤</button>`;
    div.addEventListener("click", (e)=>{ if(!e.target.classList.contains("heart-btn")) openProductModal(idx); });
    div.querySelector(".heart-btn").addEventListener("click", (e)=>{ e.stopPropagation(); toggleFavourite(e.currentTarget.dataset.key, e.currentTarget); });
    list.appendChild(div);
  });
}

function applyFilters(){ renderProducts(filterProducts(getState())); }

function updateFilterOptions() {
  const state = getState();
  const catList = uniqueValues(filterProducts(state, 'category'), 'category').sort();
  const catSel = document.getElementById("category");
  catSel.innerHTML = '<option value="">All</option>' + catList.map(c=>`<option value="${c}">${c}</option>`).join("");
  catSel.value = catList.includes(state.category) ? state.category : "";

  const matList = uniqueValues(filterProducts(state, 'material'), 'material').sort();
  const matSel = document.getElementById("material");
  matSel.innerHTML = '<option value="">All</option>' + matList.map(m=>`<option value="${m}">${m}</option>`).join("");
  matSel.value = matList.includes(state.material) ? state.material : "";

  buildColourDropdown(uniqueValues(filterProducts(state, 'colour'), 'colour').sort(), true);
  buildRoomCards(uniqueValues(filterProducts(state, 'room'), 'room').sort());
  buildStyleCards(uniqueValues(filterProducts(state, 'style'), 'style').sort());

  document.querySelectorAll("#roomSelector .style-card").forEach(c => c.classList.toggle("active", c.textContent.trim() === selectedRoom));
  document.querySelectorAll("#styleSelector .style-card").forEach(c => c.classList.toggle("active", c.textContent.trim() === selectedStyle));
}

// --------- FAVOURITES & MODAL ----------
function toggleFavourite(key, btnEl){
  if(!key) return;
  const i = favourites.indexOf(key);
  if(i>=0){ favourites.splice(i,1); btnEl.classList.remove("liked"); }
  else{ favourites.push(key); btnEl.classList.add("liked","pulse"); setTimeout(()=>btnEl.classList.remove("pulse"),300); }
  localStorage.setItem("favourites", JSON.stringify(favourites));
}

const modalOverlay = document.getElementById("productModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const modalCat = document.getElementById("modalCategory");
const modalMat = document.getElementById("modalMaterial");
const modalCol = document.getElementById("modalColour");
const modalStyle = document.getElementById("modalStyle");
const modalDesc = document.getElementById("modalDescription");
const modalLink = document.getElementById("modalLink");
const modalClose = document.getElementById("modalClose");
const modalHeart = document.getElementById("modalHeart");
const modalRoom = document.getElementById("modalRoom");
const modalDimsText = document.getElementById("modalDimsText");
const modalRoomsetBtn = document.getElementById("modalRoomsetBtn");
let modalKey = "";

const createFloorplanBtn = document.getElementById("createFloorplan");
const fpPopup = document.getElementById("fpPopup");

function openProductModal(index){
  const filtered = filterProducts(getState());
  const p = filtered[index];
  if(!p) return;
  modalImage.src = getImage(p);
  modalImage.onerror = () => modalImage.src = "https://placehold.co/640x480?text=No+Image";
  modalTitle.textContent = p.title || "Untitled";
  modalPrice.textContent = `£${(parseFloat(p.price)||0).toFixed(2)}`;
  modalRoom.textContent = p.room || "—";
  modalDimsText.textContent = formatDims(p) || "—";
  modalCat.textContent = p.category || "—";
  modalMat.textContent = p.material || "—";
  modalCol.textContent = p.colour || "—";
  modalStyle.textContent = p.style || deriveStyle(p.title || p.description);
  modalDesc.textContent = p.description || "—";
  modalRoomsetBtn.textContent = inRoomset(productKey(p)) ? "🗑️ Remove from Roomset" : "🪄 Add to Roomset";
  modalRoomsetBtn.classList.toggle("active", inRoomset(productKey(p)));
  modalKey = productKey(p);
  modalLink.style.display = p.url ? "inline-block" : "none";
  if(p.url) modalLink.href = p.url;
  modalHeart.classList.toggle("liked", favourites.includes(modalKey));
  modalOverlay.style.display = "flex";
  modalOverlay.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}

function closeProductModal(){
  modalOverlay.style.display = "none";
  modalOverlay.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeProductModal);
modalOverlay.addEventListener("click", (e)=>{ if(e.target === modalOverlay) closeProductModal(); });
document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeProductModal(); });
modalHeart.addEventListener("click", ()=>{ toggleFavourite(modalKey, modalHeart); applyFilters(); });

modalRoomsetBtn.addEventListener("click", () => {
  const p = filterProducts(getState()).find(prod => productKey(prod) === modalKey);
  if (!p) return;
  toggleRoomset(p);
  modalRoomsetBtn.textContent = inRoomset(productKey(p)) ? "🗑️ Remove from Roomset" : "🪄 Add to Roomset";
  modalRoomsetBtn.classList.toggle("active", inRoomset(productKey(p)));
});

/* -------------------------------------------------------
   CATEGORY NORMALISATION + ROOM DERIVATION
------------------------------------------------------- */
function normalizeCategory(raw = "") {
  const t = raw.toLowerCase().trim();
  if (t.includes("mirror")) return "mirror";
if (t.includes("rug") || t.includes("carpet")) return "rug";
if (t.includes("lamp") || t.includes("lighting")) return "lighting";
if (t.includes("art") || t.includes("picture") || t.includes("decor")) return "decor";
  if (t.includes("bed frame") || t.includes("ottoman") || t.includes("divan") || t.includes("upholstered bed")) return "bed";
  if (t === "bed" || t === "beds") return "bed";
  if (t.includes("headboard")) return "headboard";
  if (t.includes("bedside")) return "bedside table";
  if (t.includes("drawer") || t.includes("chest")) return "drawers";
  if (t.includes("wardrobe")) return "wardrobe";
  if (t.includes("dressing")) return "dressing table";
  if (t.includes("furniture set")) return "furniture set";
  if (t.includes("sofa")) return "sofa";
  if (t.includes("armchair") || t.includes("accent chair") || t.includes("recliner")) return "armchair";
  if (t.includes("coffee")) return "coffee table";
  if (t.includes("console")) return "console table";
  if (t.includes("tv") || t.includes("media") || t.includes("entertainment")) return "tv unit";
  if (t.includes("bookcase")) return "bookcase";
  if (t.includes("cabinet") || t.includes("cupboard") || t.includes("storage")) return "cabinet";
  if (t.includes("dining table")) return "dining table";
  if (t.includes("dining chair")) return "dining chair";
  if (t.includes("bench")) return "bench";
  if (t.includes("sideboard") || t.includes("buffet")) return "sideboard";
  if (t.includes("nest")) return "side table";
  if (t.includes("desk")) return "desk";
  if (t.includes("office chair")) return "office chair";
  if (t.includes("table")) return "table";
  return "misc";
}

function deriveRoom(cat = "") {
  switch (cat) {
    case "mirror":
case "decor":
case "rug":
case "lighting":
  return selectedRoom || "living";
    case "bed":
    case "headboard":
    case "bedside table":
    case "drawers":
    case "wardrobe":
    case "dressing table":
    case "furniture set":
      return "bedroom";
    case "sofa":
    case "armchair":
    case "coffee table":
    case "console table":
    case "tv unit":
    case "cabinet":
    case "bookcase":
      return "living";
    case "dining table":
    case "dining chair":
    case "sideboard":
    case "bench":
    case "side table":
      return "dining";
    case "desk":
    case "office chair":
      return "office";
    default:
      return "";
  }
}

// --------- LOAD PRODUCTS ----------
async function loadProducts() {
  const res = await fetch(API_URL);
  const data = await res.json();
  const raw = Array.isArray(data) ? data : (data.products || []);
  allProducts = raw.map(p => ({
    ...p,
    category: normalizeCategory(p.category || ""),
    room: deriveRoom(normalizeCategory(p.category || "")),
    material: p.material || "Unknown",
    colour: (p.colour || "").toLowerCase().trim(),
    cutout_local_path: normalizeCutoutPath(p.cutout_local_path),
    style: p.style || deriveStyle(p.title || p.description),
    title: p.title || "",
    price: p.price || 0
  }));
  const styles = uniqueValues(allProducts, "style").sort();
  const cats = uniqueValues(allProducts, "category").sort();
  const mats = uniqueValues(allProducts, "material").sort();
  const cols = uniqueValues(allProducts, "colour").sort();
  const rooms = uniqueValues(allProducts, "room").sort();
  buildRoomCards(rooms);
  buildStyleCards(styles);
  document.getElementById("category").innerHTML = '<option value="">All</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join("");
  document.getElementById("material").innerHTML = '<option value="">All</option>' + mats.map(m => `<option value="${m}">${m}</option>`).join("");
  buildColourDropdown(cols, true);
  const maxP = Math.ceil(Math.max(0, ...allProducts.map(p => parseFloat(p.price) || 0)) / 50) * 50 || 2000;
  const pr = document.getElementById("priceRange");
  pr.max = maxP; pr.value = maxP;
  document.getElementById("priceValue").textContent = `£${maxP}`;
  renderProducts(allProducts);
}

// --------- TOP BAR FILTER CONTROLS ----------
document.getElementById("toggleFavourites").addEventListener("click", ()=>{
  showFavourites = !showFavourites;
  document.getElementById("toggleFavourites").textContent = showFavourites ? "🔙 View All Products" : "⭐ View Favourites";
  applyFilters();
});

document.getElementById("clearFilters").addEventListener("click", ()=>{
  document.getElementById("searchBox").value = "";
  document.getElementById("category").value = "";
  document.getElementById("material").value = "";
  selectedColour = ""; document.getElementById("colourSelect").textContent = "All";
  selectedStyle = ""; selectedRoom = "";
  document.querySelectorAll(".style-card").forEach(c=>c.classList.remove("active"));
  const max = document.getElementById("priceRange").max || 2000;
  document.getElementById("priceRange").value = max;
  document.getElementById("priceValue").textContent = `£${max}`;
  updateFilterOptions(); applyFilters();
});

document.getElementById("filterToggle").addEventListener("click", ()=>{
  const btn = document.getElementById("filterToggle");
  const f = document.getElementById("filters");
  const active = f.classList.toggle("active");
  btn.textContent = active ? "Hide Filters ▲" : "Show Filters ▼";
});
// -------------------------------------------------------
// STEP 1 — Sync roomsetPrompt ↔ searchBox
// -------------------------------------------------------
const searchBoxInput = document.getElementById("searchBox");
const roomsetPromptInput = document.getElementById("roomsetPrompt");

if (searchBoxInput && roomsetPromptInput) {
  // Typing in search box updates roomset prompt
  searchBoxInput.addEventListener("input", () => {
    roomsetPromptInput.value = searchBoxInput.value;
  });

  // Typing in roomset prompt updates search box
  roomsetPromptInput.addEventListener("input", () => {
    searchBoxInput.value = roomsetPromptInput.value;
  });
}

document.getElementById("searchBox").addEventListener("input", async () => {
  const q = document.getElementById("searchBox").value.trim();

  if (!q) {
    updateFilterOptions();
    applyFilters();
    return;
  }

  // 🔍 DEBUG: confirm input fires
  console.log("🧠 Calling aiClassify with query:", q);

  const ai = await aiClassify(q);

  // 🔍 DEBUG: confirm AI returns
  console.log("🧠 AI RESULT RECEIVED:", ai);

  if (ai?.categories?.length > 0) {
    document.getElementById("category").value = ai.categories[0];
  }

  updateFilterOptions();
  applyFilters();
});

document.getElementById("searchBox").addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;

  e.preventDefault();

  const q = e.target.value.trim();
  if (!q) return;

  console.log("⌨️ Enter pressed → calling aiClassify:", q);

  const ai = await aiClassify(q);

  console.log("🧠 AI RESULT (Enter):", ai);

  if (ai?.categories?.length > 0) {
    document.getElementById("category").value = ai.categories[0];
  }

  updateFilterOptions();
  applyFilters();
});

// --------- ROOMSET CORE ELEMENTS ----------
const roomsetCanvas = document.getElementById("roomsetCanvas");
const roomsetList   = document.getElementById("roomsetList");

if (!roomsetCanvas || !roomsetList) {
  console.error("❌ Roomset elements not found in DOM");
} else {
  roomsetCanvas.style.position = "relative";
  roomsetCanvas.style.overflow = "hidden";
}

// --------- ROOMSET MODAL & CONTROLS ----------
const roomsetModal     = document.getElementById("roomsetModal");
const toggleRoomsetBtn = document.getElementById("toggleRoomset");
const closeRoomset     = document.getElementById("roomsetClose");
const viewListBtn      = document.getElementById("viewListBtn");
const viewCanvasBtn    = document.getElementById("viewCanvasBtn");

if (!roomsetModal || !toggleRoomsetBtn) {
  console.error("❌ Roomset modal or toggle button missing from DOM");
}

// --------- ROOMSET BACKGROUND SELECTOR ----------
const ROOMSET_BACKGROUNDS = Array.from(
  { length: 13 },
  (_, i) => `assets/roomset-canvas-image-${i + 1}.jpg`
);

const roomsetBackgrounds = document.getElementById("roomsetBackgrounds");

function renderRoomsetBackgrounds() {
  if (!roomsetBackgrounds) return;

  roomsetBackgrounds.innerHTML = "";

  ROOMSET_BACKGROUNDS.forEach((src) => {
    const div = document.createElement("div");
    div.className = "roomset-bg-thumb";
    div.style.backgroundImage = `url('${src}')`;
    div.style.backgroundSize = "cover";
    div.style.backgroundPosition = "center";
    div.style.cursor = "pointer";
    div.style.width = "120px";
    div.style.height = "80px";
    div.style.borderRadius = "8px";
    div.style.boxShadow = "var(--shadow-sm)";
    div.style.border = "3px solid transparent";
    div.style.marginBottom = "8px";

div.addEventListener("click", () => {
  canvasMode = true;
  isFloorplanMode = false;
setBlueprintBackground(false);

  roomsetList.style.display = "none";
  roomsetCanvas.style.display = "block";

  const bgLayer = getRoomsetBgLayer();
  if (bgLayer) {
    bgLayer.style.display = "block";
    bgLayer.style.backgroundImage = `url('${src}')`;
    bgLayer.style.backgroundSize = "contain"; // ✅ fits inside canvas area
    bgLayer.style.backgroundPosition = "center";
    bgLayer.style.backgroundRepeat = "no-repeat";
  }

  // ✅ room photo mode should NOT have blueprint background
  setBlueprintBackground(false);

  // remove floorplan SVG if any
  const svg = roomsetCanvas.querySelector("svg.floorplan-bg");
  if (svg) svg.remove();

  const fpControls = document.getElementById("fpControls");
  if (fpControls) fpControls.style.display = "none";

  renderRoomsetCanvas();
  showViewSwitchControl();

  document.querySelectorAll(".roomset-bg-thumb")
    .forEach(el => el.style.border = "3px solid transparent");
  div.style.border = "3px solid var(--accent)";
});


    roomsetBackgrounds.appendChild(div);
  });
}
function getRoomsetBgLayer() {
  if (!roomsetCanvas) return null;

  let layer = roomsetCanvas.querySelector(".roomset-bg-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.className = "roomset-bg-layer";
    layer.style.position = "absolute";
    layer.style.inset = "0";
    layer.style.zIndex = "0";
    layer.style.pointerEvents = "none";
    layer.style.borderRadius = "16px";
    layer.style.backgroundRepeat = "no-repeat";
    layer.style.backgroundPosition = "center";
    layer.style.backgroundSize = "contain"; // ✅ FITS the area (not cropped)
    layer.style.backgroundColor = "transparent";
    roomsetCanvas.prepend(layer);
  }
  return layer;
}


renderRoomsetBackgrounds();

// --------- VIEW SWITCH CONTROLS ----------
function getRoomsetBgLayer() {
  if (!roomsetCanvas) return null;

  let layer = document.getElementById("roomsetBgLayer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "roomsetBgLayer";
    layer.style.position = "absolute";
    layer.style.inset = "0";
    layer.style.zIndex = "0";
    layer.style.pointerEvents = "none";
    layer.style.backgroundSize = "cover";
    layer.style.backgroundPosition = "center";
    layer.style.backgroundRepeat = "no-repeat";
    roomsetCanvas.prepend(layer); // IMPORTANT: behind items
  }
  return layer;
}


function showViewSwitchControl() {
  let switcher = document.getElementById("viewSwitcher");

  if (!switcher) {
    switcher = document.createElement("div");
    switcher.id = "viewSwitcher";
    switcher.style.position = "absolute";
    switcher.style.top = "16px";
    switcher.style.right = "16px";
    switcher.style.zIndex = "200";
    switcher.style.background = "#fff";
    switcher.style.borderRadius = "8px";
    switcher.style.boxShadow = "var(--shadow-md)";
    switcher.style.padding = "8px 12px";

    // keep it inside the modal/canvas area, not floating on the page
    if (roomsetCanvas) {
      roomsetCanvas.appendChild(switcher);
    } else {
      document.body.appendChild(switcher);
    }
  }

  switcher.innerHTML = `
    <button id="switchToRoomset" type="button">Roomset</button>
    <button id="switchTo3D" type="button">Floorplan</button>
  `;

  const btnRoomset = document.getElementById("switchToRoomset");
  const btn3D = document.getElementById("switchTo3D");

  if (btnRoomset) {
    btnRoomset.onclick = () => {
      isFloorplanMode = false;
      canvasMode = true;

      const bgLayer = getRoomsetBgLayer();
      if (bgLayer) bgLayer.style.display = "block";

      setBlueprintBackground(false);

      roomsetList.style.display = "none";
      roomsetCanvas.style.display = "block";

      const fpControls = document.getElementById("fpControls");
      if (fpControls) fpControls.style.display = "none";

      renderRoomsetCanvas();
    };
  }

  if (btn3D) {
    btn3D.onclick = () => {
      isFloorplanMode = true;
      canvasMode = true;

      const bgLayer = getRoomsetBgLayer();
      if (bgLayer) bgLayer.style.display = "none"; // hide room photo in floorplan mode

      setBlueprintBackground(true);

      roomsetList.style.display = "none";
      roomsetCanvas.style.display = "block";

      const fpControls = document.getElementById("fpControls");
      if (fpControls) fpControls.style.display = "block";
    };
  }
}



function renderRoomset(){
  if (roomset.length === 0) {
    roomsetList.innerHTML = `<p style="color:var(--muted);">No items in your roomset yet.<br>Add some using "Add to Roomset".</p>`;
    return;
  }
  roomsetList.innerHTML = roomset.map(it => {
    const imgSrc = it.cutout_local_path?.trim() ? it.cutout_local_path : getImage(it);
    return `<div class="roomset-item-list">
      <img src="${imgSrc}" alt="${it.title}">
      <div class="roomset-item-info"><h4>${it.title}</h4><p>${it.style || '—'} | £${parseFloat(it.price || 0).toFixed(2)}</p></div>
      <button class="roomset-remove-btn" onclick="removeFromRoomset('${it.key}');renderRoomset();renderRoomsetCanvas();">Remove</button>
    </div>`;
  }).join("");
}

function createFloorplanSvg(width, depth) {
  const old = roomsetCanvas.querySelector("svg.floorplan-bg");
  if (old) old.remove();
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.classList.add("floorplan-bg");
  svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 800 500");
  svg.style.position = "absolute";
svg.style.inset = "0";
svg.style.zIndex = "5";
svg.style.pointerEvents = "auto";

/* ✅ BLUEPRINT BACKGROUND LIVES ON SVG */
svg.style.backgroundImage =
  "repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 20px)," +
  "repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 20px)";
svg.style.backgroundColor = "#ffffff";


  const svgFloorMargin = 20;
  const svgAreaWidthPx = 700 - svgFloorMargin * 2;
  const svgAreaDepthPx = 250 - svgFloorMargin * 2;
  const scaleW = svgAreaWidthPx / width;
  const scaleD = svgAreaDepthPx / depth;
  currentScalePxPerM = Math.min(scaleW, scaleD);
  const roomWidthPx = width * currentScalePxPerM;
  const roomDepthPx = depth * currentScalePxPerM;

  const floorRect = document.createElementNS(svgNS, "rect");
  floorRect.setAttribute("x", "50"); floorRect.setAttribute("y", "200");
  floorRect.setAttribute("width", roomWidthPx); floorRect.setAttribute("height", roomDepthPx);
  floorRect.setAttribute("fill", "#e8e8e8"); floorRect.setAttribute("stroke", "#999"); floorRect.setAttribute("stroke-width", "3");
  svg.appendChild(floorRect);

  const widthText = document.createElementNS(svgNS, "text");
  widthText.setAttribute("x", 50 + roomWidthPx / 2); widthText.setAttribute("y", 190);
  widthText.setAttribute("font-size", "16"); widthText.setAttribute("text-anchor", "middle");
  widthText.setAttribute("fill", "#555"); widthText.textContent = `Width: ${width}m`;
  svg.appendChild(widthText);

  const depthY = 200 + roomDepthPx / 2;
  const depthText = document.createElementNS(svgNS, "text");
  depthText.setAttribute("x", 30); depthText.setAttribute("y", depthY);
  depthText.setAttribute("font-size", "16"); depthText.setAttribute("text-anchor", "middle");
  depthText.setAttribute("fill", "#555");
  depthText.setAttribute("transform", `rotate(-90, 30, ${depthY})`);
  depthText.textContent = `Depth: ${depth}m`;
  svg.appendChild(depthText);

  floorplanFeatures.forEach(f => {
    if (f.type === "door" || f.type === "window") {
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", f.x); rect.setAttribute("y", f.y);
      rect.setAttribute("width", f.w); rect.setAttribute("height", f.h);
      rect.setAttribute("fill", f.type === "door" ? "#8e7b6b" : "#aee3f7");
      rect.setAttribute("stroke", "#333"); rect.setAttribute("stroke-width", "2");
      rect.setAttribute("rx", "6"); rect.setAttribute("ry", "6");
      svg.appendChild(rect);
    }
  });

  svg.addEventListener("click", function(e) {
    if (!addFeatureMode) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = addFeatureMode === "door" ? 60 : 80;
    const h = addFeatureMode === "door" ? 16 : 40;
    floorplanFeatures.push({ type: addFeatureMode, x, y, w, h });
    localStorage.setItem("floorplanFeatures", JSON.stringify(floorplanFeatures));
    createFloorplanSvg(width, depth);
    addFeatureMode = null;
  });

  roomsetCanvas.appendChild(svg);
}

function renderRoomsetCanvas() {
  if (!roomsetCanvas) return;

  roomsetCanvas
    .querySelectorAll(".roomset-item, .roomset-empty-msg")
    .forEach(el => el.remove());

  if (roomset.length === 0) {
    const empty = document.createElement("div");
    empty.className = "roomset-empty-msg";
    empty.style.position = "absolute";
    empty.style.inset = "0";
    empty.style.display = "flex";
    empty.style.alignItems = "center";
    empty.style.justifyContent = "center";
    empty.style.color = "var(--muted)";
    empty.style.pointerEvents = "none";
    empty.innerHTML = 'No items yet. Use "Add to Roomset".';
    roomsetCanvas.appendChild(empty);
    return;
  }

  const stageRect = roomsetCanvas.getBoundingClientRect();

  // ✅ sensible fallback size based on canvas size (prevents tiny items)
  const base = Math.min(stageRect.width, stageRect.height);
  const fallbackW = Math.max(140, Math.round(base * 0.22));
  const fallbackH = Math.max(140, Math.round(base * 0.22));

  roomset.forEach((it, idx) => {
    const item = document.createElement("div");
    item.className = "roomset-item";
    item.style.position = "absolute";
    item.style.zIndex = "10";

    const x = it.x ?? (60 + (idx * 60) % Math.max(1, stageRect.width - fallbackW));
    const y = it.y ?? (60 + Math.floor(idx / 4) * (fallbackH + 20));

const wCm = parseFloat(it.width_cm);
const dCm = parseFloat(it.depth_cm);
const hCm = parseFloat(it.height_cm);

// Use the dominant real-world dimension
const dominantCm = Math.max(
  Number.isFinite(wCm) ? wCm : 0,
  Number.isFinite(dCm) ? dCm : 0,
  Number.isFinite(hCm) ? hCm : 0
);

// Convert to pixels
const scaledPx = dominantCm > 0
  ? (dominantCm / 100) * currentScalePxPerM
  : Math.min(fallbackW, fallbackH);

// Category-aware visual sanity
const isBed = it.category === "bed";

const sizePx = isBed
  ? Math.max(200, scaledPx)          // beds must always read as large
  : Math.min(150, Math.max(90, scaledPx));

const w = sizePx;
const h = sizePx;


    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    item.style.width = `${w}px`;
    item.style.height = `${h}px`;
    item.style.transform = `rotate(${it.rot ?? 0}deg)`;

    const imgSrc = it.cutout_local_path?.trim()
      ? it.cutout_local_path
      : getImage(it);

    item.innerHTML = `<img src="${imgSrc}" alt="${it.title || ""}" title="${it.title || ""}">`;
    roomsetCanvas.appendChild(item);

    // --- Drag logic (kept) ---
    let dragging = false, offsetX = 0, offsetY = 0;

    function startDrag(e) {
      dragging = true;
      const point = e.touches ? e.touches[0] : e;
      const rect = item.getBoundingClientRect();
      offsetX = point.clientX - rect.left;
      offsetY = point.clientY - rect.top;
      item.style.zIndex = "20";
      e.preventDefault();
    }

    function moveDrag(e) {
      if (!dragging) return;
      const point = e.touches ? e.touches[0] : e;
      const rect = roomsetCanvas.getBoundingClientRect();

      let nx = point.clientX - rect.left - offsetX;
      let ny = point.clientY - rect.top - offsetY;

      nx = Math.max(0, Math.min(rect.width - item.offsetWidth, nx));
      ny = Math.max(0, Math.min(rect.height - item.offsetHeight, ny));

      item.style.left = nx + "px";
      item.style.top = ny + "px";
    }

    function endDrag() {
      if (!dragging) return;
      dragging = false;

      const rect = item.getBoundingClientRect();
      const parent = roomsetCanvas.getBoundingClientRect();

      it.x = rect.left - parent.left;
      it.y = rect.top - parent.top;
      saveRoomset();

      item.style.zIndex = "10";
    }

    item.addEventListener("mousedown", startDrag);
    item.addEventListener("touchstart", startDrag, { passive: false });
    document.addEventListener("mousemove", moveDrag);
    document.addEventListener("touchmove", moveDrag, { passive: false });
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchend", endDrag);
  });
}


toggleRoomsetBtn.addEventListener("click", () => {
  roomsetModal.style.display = "flex";
  roomsetModal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";

  // hide builder when opening modal
  if (builderWrap) builderWrap.style.display = "none";

  setTimeout(() => {
    if (canvasMode) {
      roomsetList.style.display = "none";
      roomsetCanvas.style.display = "block";
      renderRoomsetCanvas();
    } else {
      roomsetList.style.display = "block";
      roomsetCanvas.style.display = "none";
      renderRoomset();
    }
  }, 20);
});

closeRoomset.addEventListener("click", ()=>{ 
  roomsetModal.style.display = "none"; 
  roomsetModal.setAttribute("aria-hidden","true"); 
  document.body.style.overflow = ""; 
});

viewListBtn.addEventListener("click", ()=>{ 
  canvasMode = false;
  roomsetList.style.display = "block";
  roomsetCanvas.style.display = "none";
  if (builderWrap) builderWrap.style.display = "none";
  renderRoomset(); 
});

viewCanvasBtn.addEventListener("click", ()=>{
  canvasMode = true;
  roomsetList.style.display = "none";
  roomsetCanvas.style.display = "block";
  if (builderWrap) builderWrap.style.display = "none";

  setTimeout(() => {
    renderRoomsetCanvas();
    const fpControls = document.getElementById("fpControls");
    if (fpControls) fpControls.style.display = isFloorplanMode ? "block" : "none";
  }, 20);
});

// 🧱 FLOOR PLAN BUILDER BUTTON
const viewBuilderBtn = document.getElementById("viewBuilderBtn");

if (viewBuilderBtn && builderWrap) {
  viewBuilderBtn.addEventListener("click", () => {
    canvasMode = false;
    isFloorplanMode = false;

    // hide other views
    roomsetCanvas.style.display = "none";
    roomsetList.style.display = "none";

    // show builder
    builderWrap.style.display = "block";

    // 🔴 CRITICAL: fix canvas 0×0 bug
    resizeBuilderCanvas();
  });
}

let wasDesktop = window.innerWidth > 768;
window.addEventListener("resize", () => {
  if (!roomsetCanvas) return;
  const nowDesktop = window.innerWidth > 768;
  const items = roomsetCanvas.querySelectorAll(".roomset-item");
  if (wasDesktop && !nowDesktop) {
    items.forEach((el, i) => {
      el.style.left = 20 + (i * 20) + "px";
      el.style.top = 40 + (i * 20) + "px";
      el.style.transform = "rotate(0deg) scale(0.8)";
    });
  }
  if (!wasDesktop && nowDesktop) {
    items.forEach(el => el.style.transform = `rotate(${el.dataset.angle || 0}deg) scale(1)`);
  }
  wasDesktop = nowDesktop;
  const rect = roomsetCanvas.getBoundingClientRect();
  items.forEach(el => {
    let left = parseFloat(el.style.left) || 0;
    left = Math.max(0, Math.min(rect.width - el.offsetWidth, left));
    let top = parseFloat(el.style.top) || 0;
    top = Math.max(0, Math.min(rect.height - el.offsetHeight, top));
    el.style.left = left + "px"; el.style.top = top + "px";
  });
});

if (createFloorplanBtn && fpPopup) {
  createFloorplanBtn.addEventListener("click", () => {
    const width = parseFloat(document.getElementById("fpWidth").value);
    const depth = parseFloat(document.getElementById("fpDepth").value);
    const height = parseFloat(document.getElementById("fpHeight").value);

    if (!width || !depth || !height) {
      alert("Please enter all dimensions.");
      return;
    }

    isFloorplanMode = true;
    createFloorplanSvg(width, depth);

    // ✅ floorplan mode: hide room photo + show blueprint bg
    const bgLayer = getRoomsetBgLayer();
    if (bgLayer) bgLayer.style.display = "none";
    setBlueprintBackground(true);

    canvasMode = true;
    roomsetList.style.display = "none";
    roomsetCanvas.style.display = "block";

    renderRoomsetCanvas();
    fpPopup.style.display = "none";

    const fpControls = document.getElementById("fpControls");
    if (fpControls) fpControls.style.display = "block";
  });
}


// Global fixed floorplan controls (created once)
document.addEventListener("DOMContentLoaded", () => {
  let fpControls = document.getElementById("fpControls");
  if (fpControls) fpControls.remove(); // clean old if exists

  fpControls = document.createElement("div");
  fpControls.id = "fpControls";
  fpControls.style.position = "absolute";     // ← absolute, not fixed
  fpControls.style.top = "16px";
  fpControls.style.right = "16px";
  fpControls.style.zIndex = "20";
  fpControls.style.background = "rgba(255,255,255,0.9)";
  fpControls.style.padding = "12px";
  fpControls.style.borderRadius = "12px";
  fpControls.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
  fpControls.style.display = "none";
  fpControls.innerHTML = `
    <button id="addDoorBtn" style="margin-right:10px;padding:10px 16px;font-size:15px;cursor:pointer;">🚪 Add Door</button>
    <button id="addWindowBtn" style="padding:10px 16px;font-size:15px;cursor:pointer;">🪟 Add Window</button>
  `;

  // Append directly to the canvas so it's inside the modal
  const canvas = document.getElementById("roomsetCanvas");
  if (canvas) {
  roomsetCanvas.appendChild(fpControls);
  } else {
    console.error("roomsetCanvas not found - cannot append controls");
  }

  const addDoorBtn = document.getElementById("addDoorBtn");
  if (addDoorBtn) {
    addDoorBtn.onclick = () => {
      addFeatureMode = "door";
      alert("Click anywhere on the floorplan to place a door");
    };
  }

  const addWindowBtn = document.getElementById("addWindowBtn");
  if (addWindowBtn) {
    addWindowBtn.onclick = () => {
      addFeatureMode = "window";
      alert("Click anywhere on the floorplan to place a window");
    };
  }
});

// Clear Roomset button
document.addEventListener("DOMContentLoaded", () => {
  const clearBtn = document.getElementById("roomsetClear");
  // move Clear Roomset into builder footer (left side)
if (clearBtn && builderFooter) {
  builderFooter.prepend(clearBtn);
}
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!confirm("Clear your entire roomset?")) return;
      roomset = [];
      floorplanFeatures = [];
      localStorage.setItem("roomset", JSON.stringify(roomset));
      localStorage.setItem("floorplanFeatures", JSON.stringify(floorplanFeatures));
      renderRoomset();
      renderRoomsetCanvas();
      if (isFloorplanMode) {
        const width = parseFloat(document.getElementById("fpWidth")?.value) || 8;
        const depth = parseFloat(document.getElementById("fpDepth")?.value) || 4;
        createFloorplanSvg(width, depth);
      }
    });
  }

  // Close room dimensions popup with X
  const closeFloorplanDims = document.getElementById("closeFloorplanDims");
  const floorplanDimPopup = document.getElementById("floorplanDimPopup");
  if (closeFloorplanDims && floorplanDimPopup) {
    closeFloorplanDims.addEventListener("click", () => {
      floorplanDimPopup.style.display = "none";
    });
  }
});
// --------- AI SUGGEST ELEMENTS ----------
const suggestBtn = document.getElementById("roomsetSuggestBtn");
const suggestStatus = document.getElementById("roomsetSuggestStatus");
const suggestOutput = document.getElementById("roomsetSuggestOutput");

// --------- AI SUGGEST LOGIC ----------
async function runAISuggestion(q) {
  if (!suggestStatus) return;

  console.log("🔎 AI Suggest query value:", q);

  if (!q) {
    suggestStatus.textContent = "Type something to get AI suggestions.";
    suggestStatus.style.display = "block";
    return;
  }

  suggestStatus.style.display = "block";
  suggestStatus.textContent = "AI loading…";

const ai = await aiClassify(q);
console.log("✨ AI RAW RESULT:", ai);

const maxPrice = extractMaxPrice(q);
console.log("💰 MAX PRICE INTENT:", maxPrice);


  if (!ai) {
    suggestStatus.textContent = "AI failed to respond";
    return;
  }

  // STEP 5 — keyword override
  const overrideCategories = keywordOverrideCategories(q);
  const baseCategories = overrideCategories ?? (ai.categories || []);
 const roomUsed = selectedRoom || ai.room || "";
 const expandedCategories = expandCategories(baseCategories, roomUsed);


  console.log("🧠 FINAL CATEGORIES USED:", expandedCategories);

  // Grey “AI used” box
  if (suggestOutput) {
    suggestOutput.style.display = "block";
    suggestOutput.textContent =
      "AI used: " + expandedCategories.join(", ");
  }

// --------- APPLY ROOM INTENT (explicit > AI > none) ----------
const explicitRoom = extractExplicitRoom(q);
selectedRoom = explicitRoom ?? ai.room ?? "";

console.log("🏠 ROOM USED:", selectedRoom);

// Clear manual category so AI controls it
const catEl = document.getElementById("category");
if (catEl) catEl.value = "";

// Rebuild filters AFTER room change
updateFilterOptions();



// --------- STEP 8 — PRICE-AWARE RANKING + MIN 6 ----------
let rankedMatches = allProducts
  .map(p => {
    let score = scoreProduct(p, q, expandedCategories, ai.room);

    const price = parseFloat(p.price) || Infinity;

    // 💰 Apply max price intent
    if (maxPrice !== null) {
      if (price <= maxPrice) {
        score += 25;      // reward under budget
      } else {
        score -= 60;      // strongly penalise over budget
      }
    }

    return { product: p, score };
  })
  .filter(x => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .map(x => x.product);

// 🧠 Backfill if fewer than 6
if (rankedMatches.length < 6) {
  const needed = 6 - rankedMatches.length;

  const fallbackPool = allProducts.filter(p =>
    !rankedMatches.includes(p) &&
    (
      expandedCategories.includes(p.category) ||
      (ai.room && p.room === ai.room)
    )
  );

  rankedMatches = rankedMatches.concat(fallbackPool.slice(0, needed));
}

// 🔒 Hard cap
rankedMatches = rankedMatches.slice(0, 6);

console.log("🏆 FINAL PRODUCTS (PRICE-AWARE):", rankedMatches);

// ➕ Add to roomset
rankedMatches.forEach(p => addToRoomset(p));

renderRoomset();
renderRoomsetCanvas();


  // “Added X items” message
  suggestStatus.textContent = `Added ${rankedMatches.length} items`;
  setTimeout(() => {
    suggestStatus.style.display = "none";
  }, 1500);
}

// --------- AI SUGGEST BUTTON ----------
if (suggestBtn) {
  suggestBtn.addEventListener("click", () => {
    const q = document.getElementById("searchBox").value.trim();
    runAISuggestion(q);
  });
}
// --------- ENTER KEY = AI SUGGEST ----------
const searchBox = document.getElementById("searchBox");

if (searchBox) {
  searchBox.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const q = searchBox.value.trim();
    runAISuggestion(q);
  });
}

// Load products
loadProducts();
