# YKS Deneme Takip Sistemi

Firebase ile entegre edilmiş, modern ve kullanıcı dostu YKS sınav deneme takip sistemi.

## 🚀 Özellikler

- **Kullanıcı Kimlik Doğrulama**: Firebase Authentication ile güvenli giriş/kayıt
- **Deneme Yönetimi**: TYT ve AYT denemelerini ekleme, düzenleme, silme
- **İstatistikler**: Toplam deneme sayısı, ortalama puan, en iyi puan
- **Grafik Görünümü**: İlerleme grafiği ile performans takibi
- **Filtreleme ve Sıralama**: Denemeleri tarih, puan veya isme göre sıralama
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu modern arayüz
- **Gerçek Zamanlı Veri**: Firebase Firestore ile anlık veri senkronizasyonu

## 🛠️ Kurulum

### 1. Proje Dosyalarını İndirin
```bash
git clone [repository-url]
cd yks-deneme-takip
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Firebase Projesi Oluşturun

1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. "Create a project" ile yeni proje oluşturun
3. Authentication'ı etkinleştirin (Email/Password)
4. Firestore Database'i oluşturun (Test mode)
5. Project Settings > General > Your apps bölümünden Web app ekleyin

### 4. Firebase Konfigürasyonu

`firebase-config.js` dosyasındaki konfigürasyon bilgilerini güncelleyin:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### 5. Uygulamayı Başlatın
```bash
npm start
```

Veya geliştirme modu için:
```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 📱 Kullanım

### Kayıt Olma
1. "Kayıt Ol" sekmesine tıklayın
2. E-posta ve şifre bilgilerinizi girin
3. "Kayıt Ol" butonuna tıklayın

### Deneme Ekleme
1. Giriş yaptıktan sonra "Yeni Deneme Ekle" bölümünü kullanın
2. Deneme adı, tarih ve puan bilgilerini girin
3. İsteğe bağlı notlar ekleyebilirsiniz
4. "Deneme Ekle" butonuna tıklayın

### Deneme Yönetimi
- **Düzenleme**: Deneme kartındaki "Düzenle" butonuna tıklayın
- **Silme**: "Sil" butonuna tıklayıp onaylayın
- **Filtreleme**: Üst kısımdaki filtre seçeneklerini kullanın
- **Sıralama**: Sıralama seçeneklerini değiştirin

### İstatistikler
- Ana sayfada toplam deneme sayısı, ortalama puan, en iyi puan görüntülenir
- İlerleme grafiği ile performansınızı takip edebilirsiniz

## 🗂️ Veri Yapısı

### Firestore Koleksiyonu: `exams`

```javascript
{
    userId: "string",           // Kullanıcı ID'si
    examName: "string",         // Deneme adı
    examDate: "string",         // Tarih (YYYY-MM-DD)
    tytScore: number,           // TYT puanı (0-500)
    aytScore: number,           // AYT puanı (0-500)
    totalScore: number,         // Toplam puan (0-1000)
    examNotes: "string",        // Notlar
    createdAt: timestamp,       // Oluşturulma tarihi
    updatedAt: timestamp        // Güncellenme tarihi
}
```

## 🔧 Geliştirme

### Proje Yapısı
```
yks-deneme-takip/
├── index.html              # Ana HTML dosyası
├── styles.css              # CSS stilleri
├── app.js                  # Ana JavaScript dosyası
├── firebase-config.js      # Firebase konfigürasyonu
├── package.json            # Proje bağımlılıkları
└── README.md              # Bu dosya
```

### Teknolojiler
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication + Firestore)
- **Charts**: Chart.js
- **Icons**: Font Awesome
- **Styling**: Modern CSS Grid/Flexbox

## 🚀 Deployment

### Firebase Hosting (Önerilen)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Diğer Platformlar
- Netlify
- Vercel
- GitHub Pages

## 📝 Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 Destek

Herhangi bir sorun yaşarsanız:
- GitHub Issues bölümünü kullanın
- E-posta: [your-email@example.com]

## 🔮 Gelecek Özellikler

- [ ] Deneme PDF'lerini yükleme
- [ ] Detaylı analiz raporları
- [ ] Hedef belirleme sistemi
- [ ] Sosyal özellikler (arkadaşlarla karşılaştırma)
- [ ] Mobil uygulama (React Native)
- [ ] Offline çalışma desteği
