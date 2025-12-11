// -------------------------------------------------------
// FREE IN-BROWSER AI — WebLLM (Llama 3.1 8B)
// -------------------------------------------------------
let webllmModel = null;

async function loadWebLLM() {
  if (webllmModel) return webllmModel;

  console.log("Loading WebLLM model…");

  webllmModel = await window.webllm.CreateMLCEngine(
    "Llama-3.1-8B-Instruct-q4f16_1-MLC-1k",
    {
      useIndexedDBCache: false,
      wasmUrl: undefined,
      modelId: "Llama-3.1-8B-Instruct-q4f16_1-MLC-1k"
    }
  );

  console.log("WebLLM ready:", webllmModel);
  return webllmModel;
}

async function aiClassify(query) {
  const model = await loadWebLLM();

  const prompt = `
Extract furniture categories and room from the user query.

Valid categories:
bed, wardrobe, drawers, dressing table, bedside table,
sofa, armchair, coffee table, side table, tv unit, bookcase, cabinet,
dining table, dining chair, bench, desk, office chair, sideboard.

User query: "${query}"

Return ONLY valid JSON:
{
  "categories": ["sofa", "coffee table"],
  "room": "living"
}
`;

  const response = await model.chat.completions.create({
    messages: [{ role: "user", content: prompt }]
  });

  const text = response?.choices?.[0]?.message?.content?.trim() || "";

  try {
    return JSON.parse(text);
  } catch {
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
      <div style="font-size:4rem;margin-bottom:16px">${showFavourites ? 'No favourites' : 'No products'}</div>
      <h3 style="color:var(--ink);margin-bottom:8px">${showFavourites ? 'No favourites yet' : 'No products found'}</h3>
      <p style="color:var(--muted)">${showFavourites ? 'Click the heart on products you love!' : 'Try adjusting your filters'}</p>
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
      <button class="heart-btn ${liked ? "liked":""}" title="Favourite" data-key="${p.title || p.sku || ""}">heart</button>`;
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
  modalRoomsetBtn.textContent = inRoomset(productKey(p)) ? "Remove from Roomset" : "Add to Roomset";
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
  modalRoomsetBtn.textContent = inRoomset(productKey(p)) ? "Remove from Roomset" : "Add to Roomset";
  modalRoomsetBtn.classList.toggle("active", inRoomset(productKey(p)));
});
/* -------------------------------------------------------
   CATEGORY NORMALISATION + ROOM DERIVATION
------------------------------------------------------- */
function normalizeCategory(raw = "") {
  const t = raw.toLowerCase().trim();
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
  document.getElementById("toggleFavourites").textContent = showFavourites ? "View All Products" : "View Favourites";
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
  btn.textContent = active ? "Hide Filters Up Arrow" : "Show Filters Down Arrow";
});

document.getElementById("searchBox").addEventListener("input", async () => {
  const q = document.getElementById("searchBox").value.trim();
  if (!q) { updateFilterOptions(); applyFilters(); return; }
  const ai = await aiClassify(q);
  if (ai.categories?.length > 0) document.getElementById("category").value = ai.categories[0];
  updateFilterOptions(); applyFilters();
});

// --------- ROOMSET BACKGROUND SELECTOR ----------
const ROOMSET_BACKGROUNDS = Array.from({ length: 13 }, (_, i) => `assets/roomset-canvas-image-${i + 1}.jpg`);
const roomsetBackgrounds = document.getElementById("roomsetBackgrounds");

function renderRoomsetBackgrounds() {
  if (!roomsetBackgrounds) return;
  roomsetBackgrounds.innerHTML = "";
  ROOMSET_BACKGROUNDS.forEach((src, idx) => {
    const div = document.createElement("div");
    div.className = "roomset-bg-thumb";
    div.style.backgroundImage = `url('${src}')`;
    div.style.backgroundSize = "cover";
    div.style.backgroundPosition = "center";
    div.style.cursor = "pointer";
    div.style.width = "120px"; div.style.height = "80px";
    div.style.borderRadius = "8px"; div.style.boxShadow = "var(--shadow-sm)";
    div.style.border = "3px solid transparent"; div.style.marginBottom = "8px";

    div.addEventListener("click", () => {
      canvasMode = true; isFloorplanMode = false;
      roomsetList.style.display = "none"; roomsetCanvas.style.display = "block";
      roomsetCanvas.style.backgroundImage = `url('${src}')`;
      roomsetCanvas.style.backgroundSize = "cover";
      roomsetCanvas.style.backgroundPosition = "center";
      roomsetCanvas.style.backgroundRepeat = "no-repeat";
      const svg = roomsetCanvas.querySelector("svg.floorplan-bg");
      if (svg) svg.remove();
      const fpControls = document.getElementById("fpControls");
      if (fpControls) fpControls.style.display = "none";
      setTimeout(() => renderRoomsetCanvas(), 10);
      showViewSwitchControl();
      document.querySelectorAll(".roomset-bg-thumb").forEach(el => el.style.border = "3px solid transparent");
      div.style.border = "3px solid var(--accent)";
    });
    roomsetBackgrounds.appendChild(div);
  });
}

function showViewSwitchControl() {
  let switcher = document.getElementById("viewSwitcher");
  if (!switcher) {
    switcher = document.createElement("div");
    switcher.id = "viewSwitcher";
    switcher.style.position = "fixed"; switcher.style.top = "24px"; switcher.style.right = "120px";
    switcher.style.zIndex = "101"; switcher.style.background = "#fff"; switcher.style.borderRadius = "8px";
    switcher.style.boxShadow = "var(--shadow-md)"; switcher.style.padding = "8px 16px"; switcher.style.fontWeight = "bold";
    document.body.appendChild(switcher);
  }
  switcher.innerHTML = `<button id="switchTo3D">3D Floorplan</button> <button id="switchToRoomset">Roomset Images</button>`;
  document.getElementById("switchTo3D").onclick = () => {
    canvasMode = true; isFloorplanMode = true;
    roomsetCanvas.style.backgroundImage = "none"; roomsetCanvas.style.backgroundSize = ""; roomsetCanvas.style.backgroundPosition = ""; roomsetCanvas.style.backgroundRepeat = "";
    roomsetList.style.display = "none"; roomsetCanvas.style.display = "block";
    const width = parseFloat(document.getElementById("fpWidth").value) || 8;
    const depth = parseFloat(document.getElementById("fpDepth").value) || 4;
    setTimeout(() => { createFloorplanSvg(width, depth); renderRoomsetCanvas(); }, 10);
    const fpControls = document.getElementById("fpControls");
    if (fpControls) fpControls.style.display = "block";
  };
  document.getElementById("switchToRoomset").onclick = () => {
    canvasMode = false; isFloorplanMode = false;
    roomsetList.style.display = "block"; roomsetCanvas.style.display = "none";
    const fpControls = document.getElementById("fpControls");
    if (fpControls) fpControls.style.display = "none";
  };
}

// Elements defined after DOM
const roomsetModal = document.getElementById("roomsetModal");
const roomsetList = document.getElementById("roomsetList");
const closeRoomset = document.getElementById("roomsetClose");
const toggleRoomsetBtn = document.getElementById("toggleRoomset");
const roomsetCanvas = document.getElementById("roomsetCanvas");
const viewListBtn = document.getElementById("viewListBtn");
const viewCanvasBtn = document.getElementById("viewCanvasBtn");
let canvasMode = false;

renderRoomsetBackgrounds();

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
      <button class="roomset-remove-btn" onclick="removeFromRoomset('${it.key}');renderRoomset();">Remove</button>
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
  svg.style.position = "absolute"; svg.style.inset = "0"; svg.style.zIndex = "0"; svg.style.pointerEvents = "auto";

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
  // Controls are now created globally — no creation here
}

function renderRoomsetCanvas(){
  roomsetCanvas.querySelectorAll(".roomset-item, .roomset-empty-msg").forEach(el => el.remove());
  if (roomset.length === 0) {
    const empty = document.createElement("div");
    empty.className = "roomset-empty-msg";
    empty.style.position = "absolute"; empty.style.inset = "0";
    empty.style.display = "flex"; empty.style.alignItems = "center"; empty.style.justifyContent = "center";
    empty.style.color = "var(--muted)"; empty.style.pointerEvents = "none";
    empty.innerHTML = 'No items yet. Use "Add to Roomset".';
    roomsetCanvas.appendChild(empty);
    return;
  }
  const stageRect = roomsetCanvas.getBoundingClientRect();
  roomset.forEach((it, idx)=>{
    const item = document.createElement("div");
    item.className = "roomset-item";
    const x = it.x ?? 60 + (idx*60) % (stageRect.width - 150);
    const y = it.y ?? 60 + Math.floor(idx/4)*160;
    const widthCm = parseFloat(it.width_cm) || 0;
    const heightCm = parseFloat(it.height_cm) || 0;
    const w = (widthCm / 100) * currentScalePxPerM;
    const h = (heightCm / 100) * currentScalePxPerM;
    item.style.left = `${x}px`; item.style.top = `${y}px`;
    item.style.width = `${w}px`; item.style.height = `${h}px`;
    item.style.transform = `rotate(${it.rot ?? 0}deg)`;
    item.style.zIndex = "1";
    const imgSrc = it.cutout_local_path?.trim() ? it.cutout_local_path : getImage(it);
    item.innerHTML = `<img src="${imgSrc}" alt="${it.title || ''}" title="${it.title || ''}">`;
    roomsetCanvas.appendChild(item);

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
      let x = point.clientX - rect.left - offsetX;
      let y = point.clientY - rect.top - offsetY;
      const maxX = rect.width - item.offsetWidth;
      const maxY = rect.height - item.offsetHeight;
      x = Math.max(0, Math.min(maxX, x));
      y = Math.max(0, Math.min(maxY, y));
      const floorY = rect.height - item.offsetHeight - 10;
      if (Math.abs(y - floorY) < 25) y = floorY;
      item.style.left = x + "px"; item.style.top = y + "px";
    }
    function endDrag() {
      if (dragging) {
        dragging = false;
        const rect = item.getBoundingClientRect();
        const parent = roomsetCanvas.getBoundingClientRect();
        it.x = rect.left - parent.left;
        it.y = rect.top - parent.top;
        saveRoomset();
        item.style.zIndex = "1";
      }
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
  setTimeout(() => {
    if (canvasMode) { roomsetList.style.display = "none"; roomsetCanvas.style.display = "block"; renderRoomsetCanvas(); }
    else { roomsetList.style.display = "block"; roomsetCanvas.style.display = "none"; renderRoomset(); }
  }, 20);
});

closeRoomset.addEventListener("click", ()=>{ roomsetModal.style.display = "none"; roomsetModal.setAttribute("aria-hidden","true"); document.body.style.overflow = ""; });

viewListBtn.addEventListener("click", ()=>{ canvasMode = false; roomsetList.style.display = "block"; roomsetCanvas.style.display = "none"; renderRoomset(); });

viewCanvasBtn.addEventListener("click", ()=>{
  canvasMode = true; roomsetList.style.display = "none"; roomsetCanvas.style.display = "block";
  setTimeout(() => {
    renderRoomsetCanvas();
    const fpControls = document.getElementById("fpControls");
    if (fpControls) fpControls.style.display = isFloorplanMode ? "block" : "none";
  }, 20);
});

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
    let top = parseFloat(el.style.top) || 0;
    left = Math.max(0, Math.min(rect.width - el.offsetWidth, left));
    top = Math.max(0, Math.min(rect.height - el.offsetHeight, top));
    el.style.left = left + "px"; el.style.top = top + "px";
  });
});

if (createFloorplanBtn && fpPopup) {
  createFloorplanBtn.addEventListener("click", () => {
    const width = parseFloat(document.getElementById("fpWidth").value);
    const depth = parseFloat(document.getElementById("fpDepth").value);
    const height = parseFloat(document.getElementById("fpHeight").value);
    if (!width || !depth || !height) { alert("Please enter all dimensions."); return; }
    isFloorplanMode = true;
    createFloorplanSvg(width, depth);
    roomsetCanvas.style.backgroundImage = "none";
    roomsetCanvas.style.backgroundSize = ""; roomsetCanvas.style.backgroundPosition = ""; roomsetCanvas.style.backgroundRepeat = "";
    canvasMode = true; roomsetList.style.display = "none"; roomsetCanvas.style.display = "block";
    renderRoomsetCanvas();
    fpPopup.style.display = "none";
    const fpControls = document.getElementById("fpControls");
    if (fpControls) fpControls.style.display = "block";
  });
}

// Global fixed floorplan controls (created once)
document.addEventListener("DOMContentLoaded", () => {
  let fpControls = document.getElementById("fpControls");
  if (!fpControls) {
    fpControls = document.createElement("div");
    fpControls.id = "fpControls";
    fpControls.style.position = "fixed";
    fpControls.style.top = "24px";
    fpControls.style.right = "32px";
    fpControls.style.zIndex = "100";
    fpControls.style.display = "none"; // hidden by default
    fpControls.innerHTML = `
      <button id="addDoorBtn" style="margin-right:8px;">Add Door</button>
      <button id="addWindowBtn">Add Window</button>
    `;
    document.body.appendChild(fpControls);
    document.getElementById("addDoorBtn").onclick = () => { addFeatureMode = "door"; };
    document.getElementById("addWindowBtn").onclick = () => { addFeatureMode = "window"; };
  }
});

// Load everything
loadProducts();