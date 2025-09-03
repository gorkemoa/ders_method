// Günlük soru takibi – MySQL backend ile

const SUBJECTS = [
  { key: "paragraf", label: "Paragraf" },
  { key: "matematik", label: "Matematik" },
  { key: "geometri", label: "Geometri" },
  { key: "fizik", label: "Fizik" },
  { key: "kimya", label: "Kimya" },
  { key: "biyoloji", label: "Biyoloji" }
];

const todayKey = () => new Date().toISOString().slice(0, 10);
const STORAGE_KEY = "daily-questions"; // localStorage fallback
const API_BASE = window.location.origin + '/api';

const $ = (sel) => document.querySelector(sel);
const cardsEl = $("#cards");
const totalEl = $("#total");
const noteEl = $("#note");
const todayEl = $("#today");
const historyListEl = $("#historyList");
const whoamiEl = $("#whoami");
const btnLogin = $("#btnLogin");
const btnLogout = $("#btnLogout");
const authDialog = $("#authDialog");

let counts = Object.fromEntries(SUBJECTS.map(s => [s.key, 0]));
let currentUser = null;
let authToken = null;

// Auth functions
function getAuthToken() {
  return localStorage.getItem('authToken');
}

function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// API functions
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API error');
    }
    
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

async function register(name, email, password) {
  return apiCall('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
}

async function login(email, password) {
  return apiCall('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

async function getDailyEntry() {
  return apiCall('/daily-entry');
}

async function saveDailyEntry(counts, note) {
  return apiCall('/daily-entry', {
    method: 'POST',
    body: JSON.stringify({ counts, note })
  });
}

async function getHistory() {
  return apiCall('/history');
}

// Local storage fallback
function readStore() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// Main functions
function loadToday() {
  if (currentUser) {
    // Load from server
    getDailyEntry().then(entry => {
      if (entry.counts) {
        counts = { ...counts, ...entry.counts };
      }
      noteEl.value = entry.note || "";
      render();
    }).catch(error => {
      console.error('Failed to load from server:', error);
      loadTodayLocal();
    });
  } else {
    // Load from localStorage
    loadTodayLocal();
  }
}

function loadTodayLocal() {
  const store = readStore();
  const today = store[todayKey()] || { counts, note: "" };
  counts = { ...counts, ...(today.counts || {}) };
  noteEl.value = today.note || "";
  render();
}

function render() {
  cardsEl.innerHTML = SUBJECTS.map((s) => {
    const value = counts[s.key] || 0;
    return `
      <article class="card" data-key="${s.key}">
        <div class="card-header">${s.label}</div>
        <div class="controls">
          <div class="control-btns">
            <button class="btn icon-btn icon-minus" data-action="dec">−</button>
            <button class="btn icon-btn icon-plus" data-action="inc">+</button>
          </div>
          <div>
            <div class="value">${value}</div>
            <div class="unit">soru</div>
          </div>
        </div>
      </article>`;
  }).join("");

  bindCardEvents();
  updateTotal();
}

function bindCardEvents() {
  cardsEl.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const action = e.target.getAttribute("data-action");
      if (!action) return;
      const key = card.getAttribute("data-key");
      if (action === "inc") counts[key] = (counts[key] || 0) + 1;
      if (action === "dec") counts[key] = Math.max(0, (counts[key] || 0) - 1);
      render();
    });
  });
}

function updateTotal() {
  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  totalEl.textContent = String(total);
}

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1500);
}

function saveToday() {
  if (currentUser) {
    // Save to server
    saveDailyEntry(counts, noteEl.value).then(() => {
      showToast("Sunucuya kaydedildi");
      renderHistory();
    }).catch(error => {
      console.error('Failed to save to server:', error);
      showToast("Kaydetme hatası");
    });
  } else {
    // Save to localStorage
    const store = readStore();
    store[todayKey()] = { counts: { ...counts }, note: noteEl.value || "" };
    writeStore(store);
    showToast("Yerelde kaydedildi");
    renderHistory();
  }
}

function resetAll() {
  counts = Object.fromEntries(SUBJECTS.map(s => [s.key, 0]));
  render();
}

function renderHistory() {
  if (currentUser) {
    // Load from server
    getHistory().then(history => {
      historyListEl.innerHTML = history.map(entry => {
        const dayTotal = Object.values(entry.counts || {}).reduce((a, b) => a + (b || 0), 0);
        return `<div class="history-item">${entry.date} · toplam ${dayTotal} soru</div>`;
      }).join("");
    }).catch(error => {
      console.error('Failed to load history:', error);
      renderHistoryLocal();
    });
  } else {
    // Load from localStorage
    renderHistoryLocal();
  }
}

function renderHistoryLocal() {
  const store = readStore();
  const entries = Object.entries(store)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 10);
  historyListEl.innerHTML = entries.map(([date, v]) => {
    const dayTotal = Object.values(v.counts || {}).reduce((a, b) => a + (b || 0), 0);
    return `<div class="history-item">${date} · toplam ${dayTotal} soru</div>`;
  }).join("");
}

// Auth UI functions
function updateAuthUI() {
  if (currentUser) {
    whoamiEl.textContent = currentUser.name || currentUser.email || "";
    btnLogin.style.display = "none";
    btnLogout.style.display = "inline-block";
  } else {
    whoamiEl.textContent = "";
    btnLogin.style.display = "inline-block";
    btnLogout.style.display = "none";
  }
}

function wireAuthDialog() {
  const tabs = authDialog.querySelectorAll(".tab");
  const panels = authDialog.querySelectorAll("[data-panel]");
  
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    panels.forEach(p => { 
      p.style.display = p.getAttribute("data-panel") === t.dataset.tab ? "grid" : "none"; 
    });
  }));

  const form = document.getElementById("authForms");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const active = authDialog.querySelector(".tab.active").dataset.tab;
    
    try {
      if (active === "login") {
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        
        const result = await login(email, password);
        setAuthToken(result.token);
        currentUser = result.user;
        showToast("Giriş başarılı");
        authDialog.close();
      } else {
        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        
        const result = await register(name, email, password);
        setAuthToken(result.token);
        currentUser = result.user;
        showToast("Kayıt tamamlandı");
        authDialog.close();
      }
      
      updateAuthUI();
      loadToday();
      renderHistory();
    } catch (err) {
      console.error(err);
      showToast(err.message || "İşlem başarısız");
    }
  });
}

function logout() {
  setAuthToken(null);
  currentUser = null;
  updateAuthUI();
  loadToday();
  renderHistory();
}

// Initialize
function init() {
  todayEl.textContent = new Date().toLocaleDateString("tr-TR", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
  
  $("#save").addEventListener("click", saveToday);
  $("#resetAll").addEventListener("click", resetAll);
  btnLogin?.addEventListener("click", () => authDialog.showModal());
  btnLogout?.addEventListener("click", logout);
  
  wireAuthDialog();
  
  // Check for existing auth token
  const token = getAuthToken();
  if (token) {
    // Try to validate token by making a simple API call
    getDailyEntry().then(() => {
      // Token is valid, user is logged in
      currentUser = { name: "Kullanıcı" }; // We don't store user info, just assume valid
      updateAuthUI();
      loadToday();
      renderHistory();
    }).catch(() => {
      // Token is invalid, clear it
      setAuthToken(null);
      loadToday();
      renderHistory();
    });
  } else {
    loadToday();
    renderHistory();
  }
}

document.addEventListener("DOMContentLoaded", init);