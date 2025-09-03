# Ders Method - Günlük Soru Takip Uygulaması

Öğrencilerin günlük soru çözme alışkanlıklarını takip etmelerini sağlayan web uygulaması.

## Özellikler

- **6 Ders Kartı**: Paragraf, Matematik, Geometri, Fizik, Kimya, Biyoloji
- **Günlük Takip**: Her ders için soru sayısı artırma/azaltma
- **Kullanıcı Sistemi**: Kayıt olma ve giriş yapma
- **Veri Saklama**: MySQL veritabanında kalıcı saklama
- **Geçmiş**: Son 10 günün kayıtlarını görüntüleme
- **Günlük Notlar**: Her gün için düşünce notları

## Teknolojiler

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Veritabanı**: MySQL
- **Kimlik Doğrulama**: JWT
- **Deploy**: Render.com

## Yerel Kurulum

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **MySQL veritabanı oluşturun:**
   ```sql
   CREATE DATABASE ders_method;
   ```

3. **Çevre değişkenlerini ayarlayın:**
   ```bash
   cp env.example .env
   # .env dosyasını düzenleyin
   ```

4. **Sunucuyu başlatın:**
   ```bash
   npm start
   # veya geliştirme için:
   npm run dev
   ```

5. **Tarayıcıda açın:**
   ```
   http://localhost:3000
   ```

## Render.com Deploy

1. GitHub'a push edin
2. Render.com'da yeni Web Service oluşturun
3. GitHub repo'yu bağlayın
4. `render.yaml` dosyası otomatik olarak ayarları yapacak
5. MySQL veritabanı otomatik oluşturulacak

## API Endpoints

- `POST /api/register` - Kullanıcı kaydı
- `POST /api/login` - Giriş yapma
- `GET /api/daily-entry` - Günlük kayıt getirme
- `POST /api/daily-entry` - Günlük kayıt kaydetme
- `GET /api/history` - Geçmiş kayıtları getirme
- `GET /api/health` - Sağlık kontrolü

## Veritabanı Şeması

### users
- `id` (INT, PRIMARY KEY)
- `name` (VARCHAR)
- `email` (VARCHAR, UNIQUE)
- `password` (VARCHAR, HASHED)
- `created_at` (TIMESTAMP)

### daily_entries
- `id` (INT, PRIMARY KEY)
- `user_id` (INT, FOREIGN KEY)
- `date` (DATE)
- `counts` (JSON)
- `note` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Lisans

MIT
