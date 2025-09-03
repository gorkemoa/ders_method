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
const uniqueKey = () => new Date().toISOString().replace(/[:.]/g, '-');
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
const themeToggle = $("#themeToggle");
const themeIcon = $("#themeIcon");
const progressFill = $("#progressFill");
const dailyGoalEl = $("#dailyGoal");
const weeklyTotalEl = $("#weeklyTotal");
const averageDailyEl = $("#averageDaily");
const streakDaysEl = $("#streakDays");
const bestDayEl = $("#bestDay");
const totalDaysEl = $("#totalDays");
const totalQuestionsEl = $("#totalQuestions");
const goalAchievementEl = $("#goalAchievement");
const favoriteSubjectEl = $("#favoriteSubject");
const editGoalBtn = $("#editGoal");
const goalDialog = $("#goalDialog");
const goalInput = $("#goalInput");
const recordDialog = $("#recordDialog");
const closeRecordBtn = $("#closeRecord");

let counts = Object.fromEntries(SUBJECTS.map(s => [s.key, 0]));
let currentUser = null;
let authToken = null;
let dailyGoal = 50; // Varsayılan günlük hedef

// Performance optimization
let saveTimeout = null;
let renderTimeout = null;
let isInitialized = false;

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
  
  // Smooth transition effect
  document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  setTimeout(() => {
    document.body.style.transition = '';
  }, 300);
}

function updateThemeIcon(theme) {
  if (themeIcon) {
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

// Goal Management
function loadDailyGoal() {
  const savedGoal = localStorage.getItem('dailyGoal');
  if (savedGoal) {
    dailyGoal = parseInt(savedGoal);
  }
  updateGoalDisplay();
}

function saveDailyGoal(goal) {
  dailyGoal = goal;
  localStorage.setItem('dailyGoal', goal.toString());
  updateGoalDisplay();
  updateProgressBar();
}

function updateGoalDisplay() {
  if (dailyGoalEl) {
    dailyGoalEl.textContent = dailyGoal;
  }
}

function openGoalDialog() {
  if (goalDialog && goalInput) {
    goalInput.value = dailyGoal;
    goalDialog.showModal();
  }
}

function closeGoalDialog() {
  if (goalDialog) {
    goalDialog.close();
  }
}

// Record Details Management
function showRecordDetails(date, data) {
  if (!recordDialog) return;
  
  const recordDate = document.getElementById('recordDate');
  const recordSummary = document.getElementById('recordSummary');
  const recordSubjects = document.getElementById('recordSubjects');
  const recordNote = document.getElementById('recordNote');
  
  if (recordDate) {
    recordDate.textContent = formatDate(date);
  }
  
  const total = Object.values(data.counts || {}).reduce((a, b) => a + (b || 0), 0);
  if (recordSummary) {
    recordSummary.textContent = `Toplam: ${total} soru`;
  }
  
  if (recordSubjects) {
    const subjectsHtml = Object.entries(data.counts || {})
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => {
        const subject = SUBJECTS.find(s => s.key === key);
        return `
          <div class="record-subject">
            <span class="record-subject-name">${subject?.label || key}</span>
            <span class="record-subject-count">${count} soru</span>
          </div>
        `;
      }).join('');
    
    recordSubjects.innerHTML = subjectsHtml || '<div class="record-subject"><span class="record-subject-name">Hiç soru çözülmemiş</span></div>';
  }
  
  if (recordNote) {
    if (data.note && data.note.trim()) {
      recordNote.innerHTML = `
        <div class="record-note-label">Günlük Not:</div>
        <div class="record-note-content">"${data.note}"</div>
      `;
    } else {
      recordNote.innerHTML = '<div class="record-note-content">Bu gün için not yazılmamış</div>';
    }
  }
  
  recordDialog.showModal();
}

function closeRecordDialog() {
  if (recordDialog) {
    recordDialog.close();
  }
}

// Progress Bar Management
function updateProgressBar() {
  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  const percentage = Math.min((total / dailyGoal) * 100, 100);
  
  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }
  
  // Update ARIA attributes for accessibility
  const progressBar = document.querySelector('.progress-bar');
  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', Math.round(percentage));
    progressBar.setAttribute('aria-label', `Günlük hedef ilerlemesi: %${Math.round(percentage)}`);
  }
  
  // Update goal display
  updateGoalDisplay();
}

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
  const today = todayKey();
  
  // Find the most recent entry for today
  const todayEntries = Object.entries(store)
    .filter(([_, data]) => {
      const entryDate = data.timestamp ? data.timestamp.slice(0, 10) : '';
      return entryDate === today;
    })
    .sort((a, b) => {
      const timeA = a[1].timestamp ? new Date(a[1].timestamp) : new Date(0);
      const timeB = b[1].timestamp ? new Date(b[1].timestamp) : new Date(0);
      return timeB - timeA; // Most recent first
    });
  
  if (todayEntries.length > 0) {
    const latestEntry = todayEntries[0][1];
    counts = { ...counts, ...(latestEntry.counts || {}) };
    noteEl.value = latestEntry.note || "";
  } else {
    // No entries for today, start fresh
    counts = Object.fromEntries(SUBJECTS.map(s => [s.key, 0]));
    noteEl.value = "";
  }
  
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
    const handleAction = (action, target) => {
      if (!action) return;
      
      const key = card.getAttribute("data-key");
      const oldValue = counts[key] || 0;
      
      if (action === "inc") {
        counts[key] = oldValue + 1;
        animateCardUpdate(card, 'inc');
      }
      if (action === "dec") {
        counts[key] = Math.max(0, oldValue - 1);
        animateCardUpdate(card, 'dec');
      }
      
      // Update the specific card value with animation
      const valueEl = card.querySelector('.value');
      if (valueEl) {
        valueEl.textContent = counts[key];
      }
      
      updateTotal();
      animateProgressUpdate();
      
      // Auto-save after changes
      debouncedSave();
      
      // Announce to screen readers
      const subjectName = SUBJECTS.find(s => s.key === key)?.label || key;
      const newValue = counts[key];
      announceToScreenReader(`${subjectName}: ${newValue} soru`);
    };
    
    // Click events
    card.addEventListener("click", (e) => {
      const action = e.target.getAttribute("data-action");
      handleAction(action, e.target);
    });
    
    // Keyboard events
    card.addEventListener("keydown", (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const action = e.target.getAttribute("data-action");
        handleAction(action, e.target);
      }
    });
    
    // Make buttons focusable and add ARIA labels
    const buttons = card.querySelectorAll('[data-action]');
    buttons.forEach(btn => {
      btn.setAttribute('tabindex', '0');
      btn.setAttribute('role', 'button');
      const action = btn.getAttribute('data-action');
      const key = card.getAttribute('data-key');
      const subjectName = SUBJECTS.find(s => s.key === key)?.label || key;
      
      if (action === 'inc') {
        btn.setAttribute('aria-label', `${subjectName} soru sayısını artır`);
      } else if (action === 'dec') {
        btn.setAttribute('aria-label', `${subjectName} soru sayısını azalt`);
      }
    });
  });
}

// Screen reader announcements
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Statistics calculation
function calculateStatistics() {
  if (currentUser) {
    // For logged-in users, statistics are calculated in renderHistory()
    // This function is kept for backward compatibility
    return;
  } else {
    // For local users, use localStorage
    const store = readStore();
    const entries = Object.entries(store);
    
    if (entries.length === 0) {
      updateStatisticsDisplay(0, 0, 0, 0, 0, 0, 0, '-');
      return;
    }
    
    calculateStatisticsFromEntries(entries);
  }
}

function calculateStatisticsFromData(data) {
  // Convert server data to entries format
  const entries = data.map(entry => [
    entry.date || entry.timestamp || entry.id,
    entry
  ]);
  calculateStatisticsFromEntries(entries);
}

function calculateStatisticsFromEntries(entries) {
  // Get last 7 days
  const today = new Date();
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    last7Days.push(date.toISOString().slice(0, 10));
  }
  
  // Calculate weekly total
  let weeklyTotal = 0;
  let dailyTotals = [];
  let streakDays = 0;
  let bestDay = 0;
  let totalQuestions = 0;
  let totalDays = 0;
  let goalAchievementDays = 0;
  let subjectTotals = {};
  
  // Initialize subject totals
  SUBJECTS.forEach(subject => {
    subjectTotals[subject.key] = 0;
  });
  
  // Check each day in reverse order (most recent first)
  for (let i = 0; i < last7Days.length; i++) {
    const date = last7Days[i];
    const dayEntries = entries.filter(([_, entry]) => {
      const entryDate = entry.timestamp ? entry.timestamp.slice(0, 10) : 
                       entry.date ? entry.date.slice(0, 10) : '';
      return entryDate === date;
    });
    
    if (dayEntries.length > 0) {
      const dayTotal = dayEntries.reduce((sum, [_, entry]) => {
        return sum + Object.values(entry.counts || {}).reduce((a, b) => a + (b || 0), 0);
      }, 0);
      
      dailyTotals.push(dayTotal);
      weeklyTotal += dayTotal;
      bestDay = Math.max(bestDay, dayTotal);
      
      // Add to subject totals
      dayEntries.forEach(([_, entry]) => {
        Object.entries(entry.counts || {}).forEach(([key, count]) => {
          if (count > 0) {
            subjectTotals[key] = (subjectTotals[key] || 0) + count;
          }
        });
      });
      
      // Calculate streak (consecutive days with questions)
      if (dayTotal > 0) {
        streakDays++;
      } else if (i > 0) {
        // If we hit a day with 0 questions, stop counting streak
        break;
      }
    } else {
      dailyTotals.push(0);
    }
  }
  
  // Calculate all-time statistics
  entries.forEach(([_, entry]) => {
    if (entry && entry.counts) {
      const dayTotal = Object.values(entry.counts).reduce((a, b) => a + (b || 0), 0);
      totalQuestions += dayTotal;
      totalDays++;
      
      if (dayTotal >= dailyGoal) {
        goalAchievementDays++;
      }
      
      // Add to subject totals for all time
      Object.entries(entry.counts).forEach(([key, count]) => {
        if (count > 0) {
          subjectTotals[key] = (subjectTotals[key] || 0) + count;
        }
      });
    }
  });
  
  // Calculate average
  const averageDaily = dailyTotals.length > 0 ? Math.round(weeklyTotal / 7) : 0;
  
  // Calculate goal achievement percentage
  const goalAchievement = totalDays > 0 ? Math.round((goalAchievementDays / totalDays) * 100) : 0;
  
  // Find favorite subject
  const favoriteSubject = Object.entries(subjectTotals)
    .sort((a, b) => b[1] - a[1])
    .find(([_, count]) => count > 0);
  
  const favoriteSubjectName = favoriteSubject ? 
    SUBJECTS.find(s => s.key === favoriteSubject[0])?.label || favoriteSubject[0] : '-';
  
  updateStatisticsDisplay(weeklyTotal, averageDaily, streakDays, bestDay, totalDays, totalQuestions, goalAchievement, favoriteSubjectName);
}

function updateStatisticsDisplay(weeklyTotal, averageDaily, streakDays, bestDay, totalDays, totalQuestions, goalAchievement, favoriteSubject) {
  if (weeklyTotalEl) weeklyTotalEl.textContent = weeklyTotal;
  if (averageDailyEl) averageDailyEl.textContent = averageDaily;
  if (streakDaysEl) streakDaysEl.textContent = streakDays;
  if (bestDayEl) bestDayEl.textContent = bestDay;
  if (totalDaysEl) totalDaysEl.textContent = totalDays;
  if (totalQuestionsEl) totalQuestionsEl.textContent = totalQuestions;
  if (goalAchievementEl) goalAchievementEl.textContent = goalAchievement + '%';
  if (favoriteSubjectEl) favoriteSubjectEl.textContent = favoriteSubject;
}

function updateTotal() {
  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  totalEl.textContent = String(total);
  updateProgressBar();
}

function showToast(msg, type = 'info') {
  const t = $("#toast");
  t.textContent = msg;
  t.className = `toast show ${type}`;
  
  // Add success/error styling
  if (type === 'success') {
    t.style.borderColor = 'var(--accent-success)';
  } else if (type === 'error') {
    t.style.borderColor = 'var(--accent-danger)';
  }
  
  setTimeout(() => {
    t.classList.remove("show");
    t.className = 'toast';
    t.style.borderColor = '';
  }, 2000);
}

// Animation helpers
function addAnimation(element, animationClass, duration = 1000) {
  element.classList.add(animationClass);
  setTimeout(() => {
    element.classList.remove(animationClass);
  }, duration);
}

function animateCardUpdate(card, action) {
  const valueEl = card.querySelector('.value');
  if (action === 'inc') {
    addAnimation(valueEl, 'animate-bounce', 600);
  } else if (action === 'dec') {
    addAnimation(valueEl, 'animate-pulse', 300);
  }
}

function animateProgressUpdate() {
  if (progressFill) {
    addAnimation(progressFill, 'animate-glow', 1000);
  }
}

// Debounced save function for auto-save
function debouncedSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    autoSave();
  }, 2000); // Auto-save after 2 seconds of inactivity
}

function autoSave() {
  if (!isInitialized) return;
  
  if (currentUser) {
    // Auto-save to server
    saveDailyEntry(counts, noteEl.value).catch(error => {
      console.error('Auto-save failed:', error);
    });
  } else {
    // Auto-save to localStorage
    const store = readStore();
    store[todayKey()] = { counts: { ...counts }, note: noteEl.value || "" };
    writeStore(store);
  }
}

function saveToday() {
  const saveBtn = $("#save");
  if (saveBtn) {
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;
  }
  
  const today = todayKey();
  const uniqueId = uniqueKey();
  const saveData = { 
    counts: { ...counts }, 
    note: noteEl.value || "",
    timestamp: new Date().toISOString(),
    sessionId: uniqueId
  };
  
  if (currentUser) {
    // Save to server
    saveDailyEntry(counts, noteEl.value).then(() => {
      showToast("✅ Sunucuya başarıyla kaydedildi!", 'success');
      addAnimation(saveBtn, 'success-animation', 600);
      renderHistory();
      
      // Show record details immediately after successful save
      showRecordDetails(today, saveData);
      
      // Reset for new session after showing details
      setTimeout(() => {
        resetForNewSession();
      }, 2000); // 2 saniye sonra yeni oturum başlat
    }).catch(error => {
      console.error('Failed to save to server:', error);
      showToast("❌ Kaydetme hatası oluştu", 'error');
      addAnimation(saveBtn, 'error-animation', 500);
    }).finally(() => {
      if (saveBtn) {
        saveBtn.classList.remove('loading');
        saveBtn.disabled = false;
      }
    });
  } else {
    // Save to localStorage with unique ID
    const store = readStore();
    store[uniqueId] = saveData;
    writeStore(store);
    console.log('Saved to localStorage:', uniqueId, saveData);
    console.log('Current store:', store);
    showToast("💾 Yerel depolamaya kaydedildi", 'success');
    addAnimation(saveBtn, 'success-animation', 600);
    renderHistory();
    
    // Show record details immediately after successful save
    showRecordDetails(today, saveData);
    
    // Reset for new session after showing details
    setTimeout(() => {
      resetForNewSession();
    }, 2000); // 2 saniye sonra yeni oturum başlat
    
    if (saveBtn) {
      saveBtn.classList.remove('loading');
      saveBtn.disabled = false;
    }
  }
}

function resetAll() {
  // Add confirmation for reset
  if (confirm('Tüm değerleri sıfırlamak istediğinizden emin misiniz?')) {
    counts = Object.fromEntries(SUBJECTS.map(s => [s.key, 0]));
    render();
    showToast("🔄 Tüm değerler sıfırlandı", 'info');
    
    // Animate all cards
    cardsEl.querySelectorAll('.card').forEach((card, index) => {
      setTimeout(() => {
        addAnimation(card, 'animate-bounce', 600);
      }, index * 100);
    });
  }
}

function resetForNewSession() {
  // Reset all counts to zero
  counts = Object.fromEntries(SUBJECTS.map(s => [s.key, 0]));
  
  // Clear the note
  if (noteEl) {
    noteEl.value = '';
  }
  
  // Re-render the interface
  render();
  
  // Update history list to show new record
  renderHistory();
  
  // Show success message
  showToast("🆕 Yeni oturum başlatıldı! Geçmiş kayıtlarınız korundu.", 'success');
  
  // Animate all cards for visual feedback
  cardsEl.querySelectorAll('.card').forEach((card, index) => {
    setTimeout(() => {
      addAnimation(card, 'animate-bounce', 600);
    }, index * 100);
  });
  
  // Close the record details modal if it's open
  if (recordDialog && recordDialog.open) {
    recordDialog.close();
  }
}

function renderHistory() {
  if (currentUser) {
    // Load from server
    getHistory().then(history => {
      console.log('Server history:', history);
      if (history && history.length > 0) {
        historyListEl.innerHTML = history.map(entry => {
          const dayTotal = Object.values(entry.counts || {}).reduce((a, b) => a + (b || 0), 0);
          const subjectDetails = Object.entries(entry.counts || {})
            .filter(([_, count]) => count > 0)
            .map(([key, count]) => {
              const subject = SUBJECTS.find(s => s.key === key);
              return `${subject?.label || key}: ${count}`;
            })
            .join(', ');
          
          const recordDate = entry.date || entry.timestamp?.slice(0, 10) || '';
          const recordTime = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : '';
          
          return `
            <div class="history-item" role="listitem" data-date="${entry.date || entry.timestamp}" style="cursor: pointer;">
              <div class="history-date">${formatDate(recordDate)} ${recordTime ? `- ${recordTime}` : ''}</div>
              <div class="history-total">Toplam: ${dayTotal} soru</div>
              ${subjectDetails ? `<div class="history-details">${subjectDetails}</div>` : ''}
              ${entry.note ? `<div class="history-note">"${entry.note}"</div>` : ''}
            </div>
          `;
        }).join("");
        
        // Add click events to history items
        historyListEl.querySelectorAll('.history-item[data-date]').forEach(item => {
          item.addEventListener('click', () => {
            const date = item.dataset.date;
            const entry = history.find(h => (h.date || h.timestamp) === date);
            if (entry) {
              showRecordDetails(date, entry);
            }
          });
        });
        
        // Calculate statistics with the loaded history data
        calculateStatisticsFromData(history);
      } else {
        historyListEl.innerHTML = '<div class="history-item" role="listitem">Henüz kayıt bulunmuyor</div>';
        updateStatisticsDisplay(0, 0, 0, 0, 0, 0, 0, '-');
      }
    }).catch(error => {
      console.error('Failed to load history from server:', error);
      showToast("❌ Sunucudan kayıtlar yüklenemedi, yerel kayıtlar gösteriliyor", 'error');
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
    .sort((a, b) => {
      const timeA = a[1].timestamp ? new Date(a[1].timestamp) : new Date(a[0].slice(0, 10));
      const timeB = b[1].timestamp ? new Date(b[1].timestamp) : new Date(b[0].slice(0, 10));
      return timeB - timeA; // Sort by timestamp, most recent first
    });
  
  console.log('Rendering history with', entries.length, 'entries:', entries);
  
  if (entries.length === 0) {
    historyListEl.innerHTML = '<div class="history-item" role="listitem">Henüz kayıt bulunmuyor</div>';
    updateStatisticsDisplay(0, 0, 0, 0, 0, 0, 0, '-');
    return;
  }
  
  historyListEl.innerHTML = entries.map(([sessionId, v]) => {
    const dayTotal = Object.values(v.counts || {}).reduce((a, b) => a + (b || 0), 0);
    const subjectDetails = Object.entries(v.counts || {})
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => {
        const subject = SUBJECTS.find(s => s.key === key);
        return `${subject?.label || key}: ${count}`;
      })
      .join(', ');
    
    // Use timestamp or sessionId to determine date
    const recordDate = v.timestamp ? v.timestamp.slice(0, 10) : sessionId.slice(0, 10);
    const recordTime = v.timestamp ? new Date(v.timestamp).toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : '';
    
    return `
      <div class="history-item" role="listitem" data-date="${sessionId}" style="cursor: pointer;">
        <div class="history-date">${formatDate(recordDate)} ${recordTime ? `- ${recordTime}` : ''}</div>
        <div class="history-total">Toplam: ${dayTotal} soru</div>
        ${subjectDetails ? `<div class="history-details">${subjectDetails}</div>` : ''}
        ${v.note ? `<div class="history-note">"${v.note}"</div>` : ''}
      </div>
    `;
  }).join("");
  
  // Add click events to history items
  historyListEl.querySelectorAll('.history-item[data-date]').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.date; // Use id instead of date
      const store = readStore();
      const data = store[id]; // Retrieve by id
      if (data) {
        showRecordDetails(data.timestamp ? data.timestamp.slice(0, 10) : id.slice(0, 10), data);
      }
    });
  });
  
  // Calculate statistics for local users
  calculateStatisticsFromEntries(entries);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (dateString === today.toISOString().slice(0, 10)) {
    return 'Bugün';
  } else if (dateString === yesterday.toISOString().slice(0, 10)) {
    return 'Dün';
  } else {
    return date.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }
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
  console.log('Wiring auth dialog...');
  
  const tabs = authDialog.querySelectorAll(".tab");
  const panels = authDialog.querySelectorAll("[data-panel]");
  
  console.log('Found tabs:', tabs.length, 'panels:', panels.length);
  
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    panels.forEach(p => { 
      p.style.display = p.getAttribute("data-panel") === t.dataset.tab ? "grid" : "none"; 
    });
  }));

  const form = document.getElementById("authForms");
  if (form) {
    form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const active = authDialog.querySelector(".tab.active").dataset.tab;
    
    // Sadece aktif olan paneldeki alanları kontrol et
    let isValid = true;
    if (active === "login") {
      const email = document.getElementById("loginEmail");
      const password = document.getElementById("loginPassword");
      
      // Giriş formu validasyonu
      if (!email.value.trim()) {
        email.setCustomValidity("E-posta adresi gerekli");
        isValid = false;
      } else {
        email.setCustomValidity("");
      }
      
      if (!password.value) {
        password.setCustomValidity("Şifre gerekli");
        isValid = false;
      } else {
        password.setCustomValidity("");
      }
    } else {
      const name = document.getElementById("regName");
      const email = document.getElementById("regEmail");
      const password = document.getElementById("regPassword");
      
      // Kayıt formu validasyonu
      if (!name.value.trim()) {
        name.setCustomValidity("Ad Soyad gerekli");
        isValid = false;
      } else {
        name.setCustomValidity("");
      }
      
      if (!email.value.trim()) {
        email.setCustomValidity("E-posta adresi gerekli");
        isValid = false;
      } else {
        email.setCustomValidity("");
      }
      
      if (!password.value || password.value.length < 6) {
        password.setCustomValidity("Şifre en az 6 karakter olmalı");
        isValid = false;
      } else {
        password.setCustomValidity("");
      }
    }
    
    if (!isValid) {
      return; // Form geçersizse işlemi durdur
    }
    
    try {
      if (active === "login") {
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        
        const result = await login(email, password);
        setAuthToken(result.token);
        currentUser = result.user;
        showToast("🎉 Giriş başarılı!", 'success');
        authDialog.close();
      } else {
        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        
        const result = await register(name, email, password);
        setAuthToken(result.token);
        currentUser = result.user;
        showToast("🎊 Kayıt tamamlandı!", 'success');
        authDialog.close();
      }
      
      updateAuthUI();
      loadToday();
      renderHistory();
    } catch (err) {
      console.error(err);
      showToast("❌ " + (err.message || "İşlem başarısız"), 'error');
    }
  });
  } else {
    console.error('Auth form not found');
  }
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
  console.log('Initializing app...');
  
  // Initialize theme
  initTheme();
  
  // Initialize daily goal
  loadDailyGoal();
  
  // Set today's date with better formatting
  const today = new Date();
  const options = { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  };
  todayEl.textContent = today.toLocaleDateString("tr-TR", options);
  
  // Event listeners
  $("#save").addEventListener("click", saveToday);
  $("#resetAll").addEventListener("click", resetAll);
  
  // Auto-save for notes
  if (noteEl) {
    noteEl.addEventListener("input", debouncedSave);
  }
  
  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
  
  // Goal management
  if (editGoalBtn) {
    editGoalBtn.addEventListener("click", openGoalDialog);
  }
  
  // Record dialog
  if (closeRecordBtn) {
    closeRecordBtn.addEventListener("click", closeRecordDialog);
  }
  
  // Goal dialog events
  if (goalDialog) {
    const goalForm = goalDialog.querySelector('.goal-form');
    if (goalForm) {
      goalForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newGoal = parseInt(goalInput.value);
        if (newGoal > 0) {
          saveDailyGoal(newGoal);
          closeGoalDialog();
          showToast(`🎯 Günlük hedef ${newGoal} olarak ayarlandı!`, 'success');
        }
      });
    }
    
    // Suggestion buttons
    const suggestionBtns = goalDialog.querySelectorAll('.suggestion-btn');
    suggestionBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const goal = parseInt(btn.dataset.goal);
        goalInput.value = goal;
      });
    });
  }
  
  // Global keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveToday();
    }
    
    // Ctrl/Cmd + R to reset (with confirmation)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      resetAll();
    }
    
    // Ctrl/Cmd + T to toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      toggleTheme();
    }
    
    // Escape to close modal
    if (e.key === 'Escape' && authDialog && authDialog.open) {
      authDialog.close();
    }
  });
  
  if (btnLogin) {
    console.log('Adding click listener to login button');
    btnLogin.addEventListener("click", () => {
      console.log('Login button clicked');
      if (authDialog) {
        authDialog.showModal();
      } else {
        console.error('Auth dialog not found');
      }
    });
  } else {
    console.error('Login button not found');
  }
  
  if (btnLogout) {
    btnLogout.addEventListener("click", logout);
  }
  
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
  
  // Mark as initialized
  isInitialized = true;
}

document.addEventListener("DOMContentLoaded", init);