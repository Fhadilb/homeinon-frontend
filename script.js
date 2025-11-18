const API_URL = "https://homeinon-backend.onrender.com/products";

const STYLE_IMAGES = {
  "contemporary": "assets/style-contemporary.jpg",
  "scandinavian": "assets/style-scandinavian.jpg",
  "transitional": "assets/style-transitional.jpg",
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
  // Accept ANY possible backend field name
  const candidates = [
    p.image_url,
    p.imageUrl,
    p.Image_URL,
    p["image-url"],
    p["image_url "],
    p[" image_url"],
    p["Image Url"],
    p.image,
    p.img,
    p.picture,
    p.photo,
    p.images && p.images[0]
  ];

  for (let c of candidates) {
    if (c && typeof c === "string" && c.trim() !== "") {
      return c.trim();
    }
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
  const m = s.match(/([^\\\/]+\.png)$/i);
  const file = m ? m[1] : s.replace(/^.*[\\\/]/, "");
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
  if(!key) return;
  if(inRoomset(key)) return;

  const item = {
    key,
    title: p.title || "",
    sku: p.sku || p.SKU || "",
    price: p.price || "",
    cutout_local_path: normalizeCutoutPath(p.cutout_local_path) || "",
    image_url: p.image_url || "",
    url: p.url || "",
    category: p.category || "",
    material: p.material || "",
    colour: p.colour || "",
    style: p.style || "",
    width_cm: p.width_cm ?? p.width ?? "",
    depth_cm: p.depth_cm ?? p.depth ?? "",
    height_cm: p.height_cm ?? p.height ?? "",
    x: 50,
    y: 50
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
  if(inRoomset(key)){
    removeFromRoomset(key);
  }else{
    addToRoomset(p);
  }
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
      category: (!state.category) || p.category === state.category,
      material: (!state.material) || p.material === state.material,
      colour: (!state.colour) || (p.colour && p.colour.toLowerCase().includes(state.colour.toLowerCase())),
      style: (!state.style) || p.style === state.style,
      room: (!state.room) || p.room === state.room,
      max: price <= state.max
    };
    if(ignoreField){ checks[ignoreField] = true; }
    if(showFavourites){
      checks.fav = favourites.includes(p.title || p.sku || "");
    }
    return Object.values(checks).every(Boolean);
  });
}

const uniqueValues = (arr, field)=>{
  const s = new Set();
  arr.forEach(p=>{
    const v = p[field]; if(!v) return;
    String(v).split(/[,/|;]/).forEach(x=>{
      const val = x.trim(); if(val) s.add(val);
    });
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
      updateFilterOptions();
      applyFilters();
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
      if (selectedRoom === room) {
        selectedRoom = "";
      } else {
        selectedRoom = room;
        card.classList.add("active");
      }
      updateFilterOptions();
      applyFilters();
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
  allItem.className = "colour-item";
  allItem.textContent = "All";
  allItem.addEventListener("click", ()=>{
    selectedColour = ""; select.textContent = "All"; list.classList.remove("active"); applyFilters();
  });
  list.appendChild(allItem);

  colours.forEach(c=>{
    const item = document.createElement("div");
    item.className = "colour-item";
    item.innerHTML = `<span class="swatch" style="background:${colourHex(c)}"></span>${c}`;
    item.addEventListener("click", ()=>{
      selectedColour = c;
      select.innerHTML = `<span class="swatch" style="background:${colourHex(c)}"></span>${c}`;
      list.classList.remove("active");
      updateFilterOptions();
      applyFilters();
    });
    list.appendChild(item);
  });

  if(prev){
    selectedColour = colours.includes(prev) ? prev : "";
    if(selectedColour){
      select.innerHTML = `<span class="swatch" style="background:${colourHex(selectedColour)}"></span>${selectedColour}`;
    }else{
      select.textContent = "All";
    }
  }else{
    select.textContent = "All";
  }

  select.onclick = ()=> list.classList.toggle("active");
  document.addEventListener("click", e=>{
    if(!e.target.closest(".colour-dropdown")) list.classList.remove("active");
  });
}

function renderProducts(products){
  const list = document.getElementById("product-list");
  const count = document.getElementById("product-count");
  list.innerHTML = "";
  count.textContent = `${products.length} product${products.length!==1?"s":""} found`;

  if(products.length === 0){
    list.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding:80px 20px">
        <div style="font-size:4rem; margin-bottom:16px">${showFavourites ? '💔' : '🔍'}</div>
        <h3 style="color:var(--ink); margin-bottom:8px">
          ${showFavourites ? 'No favourites yet' : 'No products found'}
        </h3>
        <p style="color:var(--muted)">
          ${showFavourites ? 'Click the ❤️ on products you love!' : 'Try adjusting your filters'}
        </p>
      </div>
    `;
    return;
  }

  products.forEach((p, idx)=>{
    const price = parseFloat(p.price) || 0;
    const liked = favourites.includes(p.title || p.sku || "");
    const div = document.createElement("div");
    div.className = "product";
    div.setAttribute("data-index", idx);

    div.innerHTML = `
      <div class="style-label">${p.style || ""}</div>
    <img src="${getImage(p)}" alt="${p.title}" />
      <div class="product-info">
        <h3>${p.title}</h3>
        <p class="price">£${price.toFixed(2)}</p>
      </div>
      <button class="heart-btn ${liked ? "liked":""}" title="Favourite" data-key="${p.title || p.sku || ""}">❤</button>
    `;

    div.addEventListener("click", (e)=>{
      if(!e.target.classList.contains("heart-btn")) openProductModal(idx);
    });
    div.querySelector(".heart-btn").addEventListener("click", (e)=>{
      e.stopPropagation();
      toggleFavourite(e.currentTarget.dataset.key, e.currentTarget);
    });

    list.appendChild(div);
  });
}

function applyFilters(){
  const filtered = filterProducts(getState());
  renderProducts(filtered);
}

function updateFilterOptions() {
  const state = getState();

  const catList = uniqueValues(filterProducts(state, 'category'), 'category').sort();
  const catSel = document.getElementById("category");
  const currentCat = state.category;
  catSel.innerHTML = '<option value="">All</option>' + catList.map(c=>`<option value="${c}">${c}</option>`).join("");
  if (currentCat && catList.includes(currentCat)) catSel.value = currentCat; else catSel.value = "";

  const matList = uniqueValues(filterProducts(state, 'material'), 'material').sort();
  const matSel = document.getElementById("material");
  const currentMat = state.material;
  matSel.innerHTML = '<option value="">All</option>' + matList.map(m=>`<option value="${m}">${m}</option>`).join("");
  if (currentMat && matList.includes(currentMat)) matSel.value = currentMat; else matSel.value = "";

  const colourList = uniqueValues(filterProducts(state, 'colour'), 'colour').sort();
  buildColourDropdown(colourList, true);

  const visibleRooms  = uniqueValues(filterProducts(state, 'room'), 'room').sort();
  const visibleStyles = uniqueValues(filterProducts(state, 'style'), 'style').sort();

  buildRoomCards(visibleRooms);
  buildStyleCards(visibleStyles);

  if (selectedRoom) {
    document.querySelectorAll("#roomSelector .style-card").forEach(c => {
      if (c.textContent.trim() === selectedRoom) c.classList.add("active");
    });
  }

  if (selectedStyle) {
    document.querySelectorAll("#styleSelector .style-card").forEach(c => {
      if (c.textContent.trim() === selectedStyle) c.classList.add("active");
    });
  }
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
const modalImage   = document.getElementById("modalImage");
const modalTitle   = document.getElementById("modalTitle");
const modalPrice   = document.getElementById("modalPrice");
const modalCat     = document.getElementById("modalCategory");
const modalMat     = document.getElementById("modalMaterial");
const modalCol     = document.getElementById("modalColour");
const modalStyle   = document.getElementById("modalStyle");
const modalDesc    = document.getElementById("modalDescription");
const modalLink    = document.getElementById("modalLink");
const modalClose   = document.getElementById("modalClose");
const modalHeart   = document.getElementById("modalHeart");
const modalRoom    = document.getElementById("modalRoom");
const modalDimsText = document.getElementById("modalDimsText");
const modalRoomsetBtn = document.getElementById("modalRoomsetBtn");

let modalKey = "";

function openProductModal(index){
  const filtered = filterProducts(getState());
  const p = filtered[index];
  if(!p) return;

  modalImage.src = p.image_url || "https://placehold.co/640x480?text=No+Image";
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

  if (inRoomset(productKey(p))) {
    modalRoomsetBtn.textContent = "🗑️ Remove from Roomset";
    modalRoomsetBtn.classList.add("active");
  } else {
    modalRoomsetBtn.textContent = "🪄 Add to Roomset";
    modalRoomsetBtn.classList.remove("active");
  }

  modalKey = p.title || p.sku || "";

  if(p.url){ modalLink.style.display="inline-block"; modalLink.href=p.url; }
  else { modalLink.style.display="none"; modalLink.removeAttribute("href"); }

  if(favourites.includes(modalKey)) modalHeart.classList.add("liked"); else modalHeart.classList.remove("liked");

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

modalHeart.addEventListener("click", ()=>{
  toggleFavourite(modalKey, modalHeart);
  applyFilters();
});

modalRoomsetBtn.addEventListener("click", () => {
  const filtered = filterProducts(getState());
  const p = filtered.find(prod => (prod.title || prod.sku) === modalTitle.textContent);
  if (!p) return;
  toggleRoomset(p);

  if (inRoomset(productKey(p))) {
    modalRoomsetBtn.textContent = "🗑️ Remove from Roomset";
    modalRoomsetBtn.classList.add("active");
  } else {
    modalRoomsetBtn.textContent = "🪄 Add to Roomset";
    modalRoomsetBtn.classList.remove("active");
  }
});

// --------- LOAD PRODUCTS ----------
async function loadProducts(){
  const res = await fetch(API_URL);
  const data = await res.json();
  allProducts = (data.products || []).map(p => {
    const roomRaw = (p.room || "").toString().trim().toLowerCase();
    let room = "";
    if (roomRaw.includes("bed")) room = "bedroom";
    else if (roomRaw.includes("din")) room = "dining";
    else if (roomRaw.includes("liv")) room = "living";
    else if (roomRaw.includes("off")) room = "office";

    return {
      ...p,
      cutout_local_path: normalizeCutoutPath(p.cutout_local_path),
      room,
      style: p.style || deriveStyle(p.title || p.description)
    };
  });

  const styles = uniqueValues(allProducts, "style").sort();
  const cats   = uniqueValues(allProducts, "category").sort();
  const mats   = uniqueValues(allProducts, "material").sort();
  const cols   = uniqueValues(allProducts, "colour").sort();
  const rooms  = uniqueValues(allProducts, "room").sort();

  buildRoomCards(rooms);
  buildStyleCards(styles);

  const catSel = document.getElementById("category");
  const matSel = document.getElementById("material");
  catSel.innerHTML = '<option value="">All</option>' + cats.map(c=>`<option value="${c}">${c}</option>`).join("");
  matSel.innerHTML = '<option value="">All</option>' + mats.map(m=>`<option value="${m}">${m}</option>`).join("");

  buildColourDropdown(cols, true);

  const maxP = Math.ceil(Math.max(0, ...allProducts.map(p=>parseFloat(p.price)||0))/50)*50 || 2000;
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
  selectedColour = "";
  document.getElementById("colourSelect").textContent = "All";
  selectedStyle = "";
  selectedRoom = "";
  document.querySelectorAll(".style-card").forEach(c=>c.classList.remove("active"));

  const max = document.getElementById("priceRange").max || 2000;
  document.getElementById("priceRange").value = max;
  document.getElementById("priceValue").textContent = `£${max}`;

  updateFilterOptions();
  applyFilters();
});

document.getElementById("filterToggle").addEventListener("click", ()=>{
  const btn = document.getElementById("filterToggle");
  const f = document.getElementById("filters");
  const isActive = f.classList.toggle("active");
  btn.textContent = isActive ? "Hide Filters ▲" : "Show Filters ▼";
});

document.getElementById("searchBox").addEventListener("input", ()=>{ updateFilterOptions(); applyFilters(); });
document.getElementById("category").addEventListener("change", ()=>{ updateFilterOptions(); applyFilters(); });
document.getElementById("material").addEventListener("change", ()=>{ updateFilterOptions(); applyFilters(); });
document.getElementById("priceRange").addEventListener("input", e=>{
  document.getElementById("priceValue").textContent = `£${e.target.value}`;
  updateFilterOptions(); applyFilters();
});
// --------- ROOMSET BACKGROUND SELECTOR ----------

// Paths to your preset canvas backgrounds
const ROOMSET_BACKGROUNDS = Array.from({ length: 13 }, (_, i) =>
  `assets/roomset-canvas-image-${i + 1}.jpg`
);

const roomsetBackgrounds = document.getElementById("roomsetBackgrounds");

// Render thumbnails into selector
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
    div.style.width = "120px";
    div.style.height = "80px";
    div.style.borderRadius = "8px";
    div.style.boxShadow = "var(--shadow-sm)";
    div.style.border = "3px solid transparent";
    div.style.marginBottom = "8px";

    div.addEventListener("click", () => {
      // clear previous backgrounds
      roomsetCanvas.style.backgroundImage = `url('${src}')`;
      roomsetCanvas.style.backgroundSize = "cover";
      roomsetCanvas.style.backgroundPosition = "center";
      roomsetCanvas.style.backgroundRepeat = "no-repeat";

      // highlight selected
      document.querySelectorAll(".roomset-bg-thumb")
        .forEach(el => el.style.border = "3px solid transparent");

      div.style.border = "3px solid var(--accent)";
    });

    roomsetBackgrounds.appendChild(div);
  });
}

// run on load
renderRoomsetBackgrounds();

// --------- ROOMSET MODAL & CANVAS / LIST ----------
const roomsetModal = document.getElementById("roomsetModal");
const roomsetList = document.getElementById("roomsetList");
const closeRoomset = document.getElementById("roomsetClose");
const toggleRoomsetBtn = document.getElementById("toggleRoomset");
const roomsetCanvas = document.getElementById("roomsetCanvas");
const viewListBtn = document.getElementById("viewListBtn");
const viewCanvasBtn = document.getElementById("viewCanvasBtn");

let canvasMode = false;

function renderRoomset(){
  if (roomset.length === 0) {
    roomsetList.innerHTML = `
      <p style="color:var(--muted);">No items in your roomset yet.<br>Add some using "Add to Roomset".</p>
    `;
    return;
  }

  roomsetList.innerHTML = roomset.map(it => {
    const imgSrc = it.cutout_local_path?.trim()
      ? it.cutout_local_path
      : getImage(it);

    return `
      <div class="roomset-item-list">
        <img src="${imgSrc}" alt="${it.title}">
        <div class="roomset-item-info">
          <h4>${it.title}</h4>
          <p>${it.style || '—'} | £${parseFloat(it.price || 0).toFixed(2)}</p>
        </div>
        <button class="roomset-remove-btn" onclick="removeFromRoomset('${it.key}');renderRoomset();">Remove</button>
      </div>
    `;
  }).join("");
}


// floorplan helper - background SVG behind items
function createFloorplanSvg(width, depth) {
  // remove old floorplan if exists
  const old = roomsetCanvas.querySelector("svg.floorplan-bg");
  if (old) old.remove();

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.classList.add("floorplan-bg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 800 500");
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.zIndex = "0";
  svg.style.pointerEvents = "none";

  const roomWidthPx = width * 60;
  const roomDepthPx = depth * 60;

  const floorRect = document.createElementNS(svgNS, "rect");
  floorRect.setAttribute("x", "50");
  floorRect.setAttribute("y", "200");
  floorRect.setAttribute("width", roomWidthPx);
  floorRect.setAttribute("height", roomDepthPx);
  floorRect.setAttribute("fill", "#e8e8e8");
  floorRect.setAttribute("stroke", "#999");
  floorRect.setAttribute("stroke-width", "3");
  svg.appendChild(floorRect);

  const widthText = document.createElementNS(svgNS, "text");
  widthText.setAttribute("x", 50 + roomWidthPx / 2);
  widthText.setAttribute("y", 190);
  widthText.setAttribute("font-size", "16");
  widthText.setAttribute("text-anchor", "middle");
  widthText.setAttribute("fill", "#555");
  widthText.textContent = `Width: ${width}m`;
  svg.appendChild(widthText);

  const depthText = document.createElementNS(svgNS, "text");
  const depthY = 200 + roomDepthPx / 2;
  depthText.setAttribute("x", 30);
  depthText.setAttribute("y", depthY);
  depthText.setAttribute("font-size", "16");
  depthText.setAttribute("text-anchor", "middle");
  depthText.setAttribute("fill", "#555");
  depthText.setAttribute("transform", `rotate(-90, 30, ${depthY})`);
  depthText.textContent = `Depth: ${depth}m`;
  svg.appendChild(depthText);

  roomsetCanvas.appendChild(svg);
}

function renderRoomsetCanvas(){
  // remove existing draggable items & empty message ONLY
  roomsetCanvas.querySelectorAll(".roomset-item").forEach(el => el.remove());
  roomsetCanvas.querySelectorAll(".roomset-empty-msg").forEach(el => el.remove());

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
    empty.innerHTML = 'No items yet. Use "＋ Add to Roomset".';
    roomsetCanvas.appendChild(empty);
    return;
  }

  const stageRect = roomsetCanvas.getBoundingClientRect();

  roomset.forEach((it, idx)=>{
    const item = document.createElement("div");
    item.className = "roomset-item";

    const x = it.x ?? 60 + (idx*60) % (stageRect.width - 150);
    const y = it.y ?? 60 + Math.floor(idx/4)*160;
    const w = it.w ?? 140;
    const h = it.h ?? 140;
    const rot = it.rot ?? 0;

    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    item.style.width = `${w}px`;
    item.style.height = `${h}px`;
    item.style.transform = `rotate(${rot}deg)`;
    item.style.zIndex = "1";

    const imgSrc = it.cutout_local_path?.trim()
  ? it.cutout_local_path
  : getImage(it);   // uses the universal image fixer

item.innerHTML = `
  <img src="${imgSrc}" alt="${it.title || ''}" title="${it.title || ''}">
  <div class="handle resize-handle"></div>
`;


    roomsetCanvas.appendChild(item);

    let dragging = false, offsetX = 0, offsetY = 0;

    function startDrag(e) {
      if (e.target.classList.contains("handle")) return;
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

      const x = point.clientX - rect.left - offsetX;
      const y = point.clientY - rect.top - offsetY;

      const itemW = item.offsetWidth;
      const itemH = item.offsetHeight;
      const maxX = rect.width - itemW;
      const maxY = rect.height - itemH;

      let boundedX = Math.max(0, Math.min(maxX, x));
      let boundedY = Math.max(0, Math.min(maxY, y));

      const floorY = rect.height - itemH - 10;
      const snapRange = 25;

      if (Math.abs(boundedY - floorY) < snapRange) {
        boundedY = floorY;
      }

      item.style.left = boundedX + "px";
      item.style.top = boundedY + "px";
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

    const resizeHandle = item.querySelector(".resize-handle");
    let resizing = false, startW=0, startH=0, startX=0, startY=0;

    function startResize(e) {
      e.stopPropagation();
      e.preventDefault();
      resizing = true;
      const point = e.touches ? e.touches[0] : e;
      startW = item.offsetWidth;
      startH = item.offsetHeight;
      startX = point.clientX;
      startY = point.clientY;
    }

    function moveResize(e) {
      if (!resizing) return;
      e.preventDefault();
      const point = e.touches ? e.touches[0] : e;
      const deltaX = point.clientX - startX;
      const deltaY = point.clientY - startY;

      const newW = Math.max(60, startW + deltaX);
      const newH = Math.max(60, startH + deltaY);

      item.style.width  = newW + "px";
      item.style.height = newH + "px";
    }

    function endResize() {
      if (resizing) {
        resizing = false;
        it.w = item.offsetWidth;
        it.h = item.offsetHeight;
        saveRoomset();
      }
    }

    resizeHandle.addEventListener("mousedown", startResize);
    resizeHandle.addEventListener("touchstart", startResize, { passive: false });
    document.addEventListener("mousemove", moveResize);
    document.addEventListener("touchmove", moveResize, { passive: false });
    document.addEventListener("mouseup", endResize);
    document.addEventListener("touchend", endResize);
  });

  const canvasRect = roomsetCanvas.getBoundingClientRect();
  const allItems = roomsetCanvas.querySelectorAll(".roomset-item");
  allItems.forEach(item => {
    let left = parseFloat(item.style.left) || 0;
    let top  = parseFloat(item.style.top)  || 0;
    const maxLeft = Math.max(0, canvasRect.width  - item.offsetWidth);
    const maxTop  = Math.max(0, canvasRect.height - item.offsetHeight);
    if (left > maxLeft) left = maxLeft;
    if (top  > maxTop)  top  = maxTop;
    item.style.left = left + "px";
    item.style.top  = top  + "px";
  });
}

toggleRoomsetBtn.addEventListener("click", () => {
  roomsetModal.style.display = "flex";
  roomsetModal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";

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
  setTimeout(() => {
    renderRoomset();
  }, 20);
});

viewCanvasBtn.addEventListener("click", ()=>{
  canvasMode = true;
  roomsetList.style.display = "none";
  roomsetCanvas.style.display = "block";
  setTimeout(() => {
    renderRoomsetCanvas();
  }, 20);
});

let wasDesktop = window.innerWidth > 768;
window.addEventListener("resize", () => {
  const canvas = roomsetCanvas;
  if (!canvas) return;

  const nowDesktop = window.innerWidth > 768;
  const items = canvas.querySelectorAll(".roomset-item");

  if (wasDesktop && !nowDesktop) {
    items.forEach((el, i) => {
      el.style.left = 20 + (i * 20) + "px";
      el.style.top = 40 + (i * 20) + "px";
      el.style.transform = "rotate(0deg) scale(0.8)";
    });
  }

  if (!wasDesktop && nowDesktop) {
    items.forEach(el => {
      el.style.transform = `rotate(${el.dataset.angle || 0}deg) scale(1)`;
    });
  }

  wasDesktop = nowDesktop;

  const rect = canvas.getBoundingClientRect();
  items.forEach(el => {
    let left = parseFloat(el.style.left) || 0;
    let top = parseFloat(el.style.top) || 0;
    const maxLeft = Math.max(0, rect.width - el.offsetWidth);
    const maxTop = Math.max(0, rect.height - el.offsetHeight);
    if (left > maxLeft) left = maxLeft;
    if (top > maxTop) top = maxTop;
    el.style.left = left + "px";
    el.style.top = top + "px";
  });
});

document.getElementById("roomsetClear").addEventListener("click", ()=>{
  if(confirm("Clear all items from your roomset?")){
    roomset = [];
    saveRoomset();
    renderRoomset();
    renderRoomsetCanvas();
  }
});

// --------- FLOORPLAN POPUP & GENERATION ----------
const fpTile = document.getElementById("bgFloorplanOption");
const fpPopup = document.getElementById("floorplanDimPopup");
const createFloorplanBtn = document.getElementById("createFloorplan");
const closeFloorplanBtn = document.getElementById("closeFloorplanDims");

if (fpTile && fpPopup) {
  fpTile.addEventListener("click", () => {
    fpPopup.style.display = "flex";
  });
}

if (closeFloorplanBtn && fpPopup) {
  closeFloorplanBtn.addEventListener("click", () => {
    fpPopup.style.display = "none";
  });
}

if (createFloorplanBtn && fpPopup) {
  createFloorplanBtn.addEventListener("click", () => {
    
    const width = parseFloat(document.getElementById("fpWidth").value);
    const depth = parseFloat(document.getElementById("fpDepth").value);
    const height = parseFloat(document.getElementById("fpHeight").value); // future use

    if (!width || !depth || !height) {
      alert("Please enter all dimensions.");
      return;
    }

    // 1️⃣ Create the SVG room background
    createFloorplanSvg(width, depth);

    // 2️⃣ Remove any image background so the floorplan is visible
    roomsetCanvas.style.backgroundImage = "none";
roomsetCanvas.style.backgroundSize = "";
roomsetCanvas.style.backgroundPosition = "";
roomsetCanvas.style.backgroundRepeat = "";

    // 3️⃣ Switch view to canvas mode
    canvasMode = true;
    roomsetList.style.display = "none";
    roomsetCanvas.style.display = "block";

    // 4️⃣ Re-render items on top of new background
    renderRoomsetCanvas();

    // 5️⃣ Close popup
    fpPopup.style.display = "none";
  });
}

/* -----------------------------------------------------------
    AI SUGGESTION ENGINE — POWERED BY WEBLLM (LOCAL MODEL)
----------------------------------------------------------- */

let ai;
let aiReady = false;
webllm.configure({
  modelPaths: {
    "phi-3-mini-4k-instruct-q4f32_1-mlc": "models/webllm/phi-3-mini-4k-instruct-q4f32_1-mlc/"
  }
});

async function initAI() {
  const status = document.getElementById("roomsetSuggestStatus");
  status.textContent = "Loading local AI model… (first load 20–40 sec)";

  try {
ai = await webllm.ChatModule.create({
  model: "phi-3-mini-4k-instruct-q4f32_1-mlc",
  model_url_type: "local",
  local_model_dir: "models/webllm/phi-3-mini-4k-instruct-q4f32_1-mlc/",
  initProgressCallback: (p) => {
    status.textContent = "Loading AI… " + Math.round(p.progress * 100) + "%";
  },
});


    aiReady = true;
    status.textContent = "AI Ready! ✨";

  } catch (err) {
    console.error("AI Load Error:", err);
    status.textContent = "❌ AI failed to load (check console)";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initAI();
});


/* -----------------------------------------------------------
    HANDLE SUGGEST BUTTON
----------------------------------------------------------- */
const roomsetPromptInput = document.getElementById("roomsetPrompt");
// Allow pressing Enter to trigger suggestions
roomsetPromptInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    document.getElementById("roomsetSuggestBtn").click();
  }
});
document.getElementById("roomsetSuggestBtn").addEventListener("click", async () => {
  const status = document.getElementById("roomsetSuggestStatus");
  const out = document.getElementById("roomsetSuggestOutput");

  const input = roomsetPromptInput.value.trim();

  if (!input) {
    alert("Please describe your room first 🙂");
    return;
  }

  if (!aiReady) {
    alert("The AI model is still loading. Please wait 10–20 seconds.");
    return;
  }

  status.textContent = "Thinking… 🤔";
  out.textContent = "";

  // Run AI
  const response = await ai.generate(input, {
    maxTokens: 200,
    temperature: 0.4
  });

  const text = response.choices[0].message.content;
  out.textContent = text;

  // Now use AI text to filter products
  const lower = text.toLowerCase();

  let matches = allProducts.filter(p => {
    return lower.includes((p.room || "").toLowerCase()) ||
           lower.includes((p.style || "").toLowerCase()) ||
           lower.includes((p.category || "").toLowerCase()) ||
           lower.includes((p.colour || "").toLowerCase());
  });

  if (matches.length === 0) {
    alert("AI understood your request, but couldn’t match items from the catalogue.");
    return;
  }

  // Limit to 6 results
  matches = matches.slice(0, 6);

  matches.forEach(p => addToRoomset(p));
  saveRoomset();
  renderRoomset();
  renderRoomsetCanvas();

  alert(`✨ AI added ${matches.length} items to your roomset!`);
});

// finally load products
loadProducts();
