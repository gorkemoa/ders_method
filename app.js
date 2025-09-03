
// Ana uygulama dosyası
import { 
    signIn, 
    signUp, 
    logout, 
    onAuthStateChange, 
    addExam, 
    getExams, 
    updateExam, 
    deleteExam, 
    getCurrentUser,
    checkFirebaseConnection 
} from './firebase-config.js';

// DOM elementleri
const authSection = document.getElementById('authSection');
const mainApp = document.getElementById('mainApp');
const userInfo = document.getElementById('userInfo');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');

// Auth formları
const loginForm = document.getElementById('loginFormElement');
const registerForm = document.getElementById('registerFormElement');
const tabBtns = document.querySelectorAll('.tab-btn');

// Ana uygulama elementleri
const addExamForm = document.getElementById('addExamForm');
const examsList = document.getElementById('examsList');
const sortBy = document.getElementById('sortBy');
const filterBy = document.getElementById('filterBy');

// İstatistik elementleri
const totalExams = document.getElementById('totalExams');
const averageScore = document.getElementById('averageScore');
const bestScore = document.getElementById('bestScore');
const lastExam = document.getElementById('lastExam');

// Global değişkenler
let currentUser = null;
let exams = [];
let progressChart = null;

// Uygulama başlatma
document.addEventListener('DOMContentLoaded', async () => {
    showLoading();
    
    // Firebase bağlantısını kontrol et
    const isConnected = await checkFirebaseConnection();
    if (!isConnected) {
        showToast('Firebase bağlantısı kurulamadı. Lütfen konfigürasyonu kontrol edin.', 'error');
    }
    
    // Auth durumunu dinle
    onAuthStateChange((user) => {
        currentUser = user;
        if (user) {
            showMainApp();
            loadExams();
        } else {
            showAuthSection();
        }
        hideLoading();
    });
    
    // Event listener'ları ekle
    setupEventListeners();
    
    // Bugünün tarihini varsayılan olarak ayarla
    document.getElementById('examDate').value = new Date().toISOString().split('T')[0];
});

// Event listener'ları kur
function setupEventListeners() {
    // Tab değiştirme
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Auth formları
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // Çıkış butonu
    logoutBtn.addEventListener('click', handleLogout);
    
    // Deneme ekleme formu
    addExamForm.addEventListener('submit', handleAddExam);
    
    // Filtreleme ve sıralama
    sortBy.addEventListener('change', () => renderExams());
    filterBy.addEventListener('change', () => renderExams());
    
    // Puan hesaplama
    document.getElementById('tytScore').addEventListener('input', calculateTotalScore);
    document.getElementById('aytScore').addEventListener('input', calculateTotalScore);
    document.getElementById('totalScore').addEventListener('input', updateIndividualScores);
}

// Tab değiştirme
function switchTab(tab) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById(`${tab}Form`).classList.add('active');
}

// Giriş yapma
async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await signIn(email, password);
        showToast('Başarıyla giriş yapıldı!', 'success');
    } catch (error) {
        showToast(getErrorMessage(error.code), 'error');
    } finally {
        hideLoading();
    }
}

// Kayıt olma
async function handleRegister(e) {
    e.preventDefault();
    showLoading();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    if (password !== passwordConfirm) {
        showToast('Şifreler eşleşmiyor!', 'error');
        hideLoading();
        return;
    }
    
    if (password.length < 6) {
        showToast('Şifre en az 6 karakter olmalıdır!', 'error');
        hideLoading();
        return;
    }
    
    try {
        await signUp(email, password);
        showToast('Hesap başarıyla oluşturuldu!', 'success');
    } catch (error) {
        showToast(getErrorMessage(error.code), 'error');
    } finally {
        hideLoading();
    }
}

// Çıkış yapma
async function handleLogout() {
    try {
        await logout();
        showToast('Başarıyla çıkış yapıldı!', 'success');
    } catch (error) {
        showToast('Çıkış yapılırken hata oluştu!', 'error');
    }
}

// Deneme ekleme
async function handleAddExam(e) {
    e.preventDefault();
    showLoading();
    
    const examData = {
        userId: currentUser.uid,
        examName: document.getElementById('examName').value,
        examDate: document.getElementById('examDate').value,
        tytScore: parseInt(document.getElementById('tytScore').value) || 0,
        aytScore: parseInt(document.getElementById('aytScore').value) || 0,
        totalScore: parseInt(document.getElementById('totalScore').value) || 0,
        examNotes: document.getElementById('examNotes').value
    };
    
    try {
        await addExam(examData);
        showToast('Deneme başarıyla eklendi!', 'success');
        addExamForm.reset();
        document.getElementById('examDate').value = new Date().toISOString().split('T')[0];
        loadExams();
    } catch (error) {
        showToast('Deneme eklenirken hata oluştu!', 'error');
    } finally {
        hideLoading();
    }
}

// Denemeleri yükle
async function loadExams() {
    if (!currentUser) return;
    
    showLoading();
    try {
        exams = await getExams(currentUser.uid);
        updateStats();
        renderExams();
        updateChart();
    } catch (error) {
        showToast('Denemeler yüklenirken hata oluştu!', 'error');
    } finally {
        hideLoading();
    }
}

// Denemeleri render et
function renderExams() {
    if (!exams.length) {
        examsList.innerHTML = '<div class="no-exams"><p>Henüz deneme eklenmemiş. İlk denemenizi ekleyin!</p></div>';
        return;
    }
    
    let filteredExams = [...exams];
    
    // Filtreleme
    const filter = filterBy.value;
    if (filter === 'tyt') {
        filteredExams = filteredExams.filter(exam => exam.tytScore > 0 && exam.aytScore === 0);
    } else if (filter === 'ayt') {
        filteredExams = filteredExams.filter(exam => exam.aytScore > 0 && exam.tytScore === 0);
    } else if (filter === 'both') {
        filteredExams = filteredExams.filter(exam => exam.tytScore > 0 && exam.aytScore > 0);
    }
    
    // Sıralama
    const sort = sortBy.value;
    if (sort === 'score') {
        filteredExams.sort((a, b) => b.totalScore - a.totalScore);
    } else if (sort === 'name') {
        filteredExams.sort((a, b) => a.examName.localeCompare(b.examName));
    } else {
        filteredExams.sort((a, b) => new Date(b.examDate) - new Date(a.examDate));
    }
    
    // HTML oluştur
    examsList.innerHTML = filteredExams.map(exam => createExamHTML(exam)).join('');
}

// Deneme HTML'i oluştur
function createExamHTML(exam) {
    const date = new Date(exam.examDate).toLocaleDateString('tr-TR');
    const hasTyt = exam.tytScore > 0;
    const hasAyt = exam.aytScore > 0;
    
    return `
        <div class="exam-item">
            <div class="exam-header">
                <div>
                    <div class="exam-title">${exam.examName}</div>
                    <div class="exam-date">${date}</div>
                </div>
                <div class="exam-actions">
                    <button class="btn btn-success" onclick="editExam('${exam.id}')">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn btn-danger" onclick="deleteExamConfirm('${exam.id}')">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </div>
            </div>
            <div class="exam-scores">
                ${hasTyt ? `
                    <div class="score-item">
                        <div class="score-label">TYT</div>
                        <div class="score-value">${exam.tytScore}</div>
                    </div>
                ` : ''}
                ${hasAyt ? `
                    <div class="score-item">
                        <div class="score-label">AYT</div>
                        <div class="score-value">${exam.aytScore}</div>
                    </div>
                ` : ''}
                <div class="score-item">
                    <div class="score-label">Toplam</div>
                    <div class="score-value">${exam.totalScore}</div>
                </div>
            </div>
            ${exam.examNotes ? `<div class="exam-notes">${exam.examNotes}</div>` : ''}
        </div>
    `;
}

// İstatistikleri güncelle
function updateStats() {
    if (!exams.length) {
        totalExams.textContent = '0';
        averageScore.textContent = '0';
        bestScore.textContent = '0';
        lastExam.textContent = '-';
        return;
    }
    
    const totalScores = exams.filter(exam => exam.totalScore > 0).map(exam => exam.totalScore);
    const average = totalScores.length ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length) : 0;
    const best = totalScores.length ? Math.max(...totalScores) : 0;
    const lastExamDate = exams.length ? new Date(exams[0].examDate).toLocaleDateString('tr-TR') : '-';
    
    totalExams.textContent = exams.length;
    averageScore.textContent = average;
    bestScore.textContent = best;
    lastExam.textContent = lastExamDate;
}

// Grafik güncelle
function updateChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    if (progressChart) {
        progressChart.destroy();
    }
    
    const chartData = exams
        .filter(exam => exam.totalScore > 0)
        .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
        .slice(-10); // Son 10 deneme
    
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(exam => new Date(exam.examDate).toLocaleDateString('tr-TR')),
            datasets: [{
                label: 'Toplam Puan',
                data: chartData.map(exam => exam.totalScore),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1000,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

// Toplam puan hesaplama
function calculateTotalScore() {
    const tytScore = parseInt(document.getElementById('tytScore').value) || 0;
    const aytScore = parseInt(document.getElementById('aytScore').value) || 0;
    const total = tytScore + aytScore;
    document.getElementById('totalScore').value = total;
}

// Bireysel puanları güncelle
function updateIndividualScores() {
    const totalScore = parseInt(document.getElementById('totalScore').value) || 0;
    const tytScore = parseInt(document.getElementById('tytScore').value) || 0;
    const aytScore = totalScore - tytScore;
    
    if (aytScore >= 0) {
        document.getElementById('aytScore').value = aytScore;
    }
}

// Deneme düzenleme
function editExam(examId) {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    
    // Form alanlarını doldur
    document.getElementById('examName').value = exam.examName;
    document.getElementById('examDate').value = exam.examDate;
    document.getElementById('tytScore').value = exam.tytScore;
    document.getElementById('aytScore').value = exam.aytScore;
    document.getElementById('totalScore').value = exam.totalScore;
    document.getElementById('examNotes').value = exam.examNotes;
    
    // Formu düzenleme moduna al
    addExamForm.dataset.editing = examId;
    addExamForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Güncelle';
    
    // Sayfayı forma kaydır
    document.querySelector('.add-exam-section').scrollIntoView({ behavior: 'smooth' });
}

// Deneme silme onayı
function deleteExamConfirm(examId) {
    if (confirm('Bu denemeyi silmek istediğinizden emin misiniz?')) {
        deleteExam(examId);
    }
}

// Deneme silme
async function deleteExam(examId) {
    showLoading();
    try {
        await deleteExam(examId);
        showToast('Deneme başarıyla silindi!', 'success');
        loadExams();
    } catch (error) {
        showToast('Deneme silinirken hata oluştu!', 'error');
    } finally {
        hideLoading();
    }
}

// UI göster/gizle
function showAuthSection() {
    authSection.style.display = 'flex';
    mainApp.style.display = 'none';
    userInfo.style.display = 'none';
}

function showMainApp() {
    authSection.style.display = 'none';
    mainApp.style.display = 'block';
    userInfo.style.display = 'flex';
    userEmail.textContent = currentUser.email;
}

function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Toast bildirimi
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // 5 saniye sonra otomatik kaldır
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Hata mesajlarını Türkçe'ye çevir
function getErrorMessage(errorCode) {
    const messages = {
        'auth/user-not-found': 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.',
        'auth/wrong-password': 'Hatalı şifre.',
        'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanımda.',
        'auth/weak-password': 'Şifre çok zayıf. En az 6 karakter olmalıdır.',
        'auth/invalid-email': 'Geçersiz e-posta adresi.',
        'auth/too-many-requests': 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.',
        'auth/network-request-failed': 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.'
    };
    
    return messages[errorCode] || 'Bilinmeyen bir hata oluştu.';
}

// Global fonksiyonlar (HTML'den çağrılabilir)
window.editExam = editExam;
window.deleteExamConfirm = deleteExamConfirm;
