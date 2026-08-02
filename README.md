# Kara Tahta Frontend

Kara Tahta'nın Vite, React ve TypeScript tabanlı kullanıcı arayüzüdür. Bu
repo yalnız frontend'i içerir; üretim API'si ayrı bir Railway servisinde
çalışır.

## Canlı sistem ve repolar

| Parça | Adres / repo |
| --- | --- |
| Frontend | `https://karatahta.ethosoft.org` |
| Railway backend | `https://karatahta-backend-production.up.railway.app` |
| VPS backend | `https://api.karatahta.ethosoft.org` |

Developer portalda backend altyapısı tarayıcı bazında seçilebilir:

- **Railway:** Bütün API istekleri Railway'e gider.
- **VPS:** Bütün API istekleri VPS'e gider.
- **Hibrit:** VPS birincil, Railway otomatik yedektir. GET/health istekleri
  güvenli biçimde failover edilir. Bir video işi başladığında job, SSE ve medya
  parçalarının iki sunucu arasında bölünmemesi için aktif backend ders boyunca
  kilitlenir.

Railway adresi `VITE_API_BASE_URL`, VPS adresi ise isteğe bağlı
`VITE_VPS_API_BASE_URL` build değişkeniyle ezilebilir.
| Backend API | `https://karatahta-backend-production.up.railway.app` |
| Frontend repo | `https://github.com/ethosoftai/karatahta-frontend` (`main`) |
| Backend repo | `https://github.com/ethosoftai/karatahta-backend` (`railway`) |
| Frontend hosting | Hazalhost cPanel |
| Backend hosting | Railway |
| Auth ve ilişkisel veri | Supabase |
| Kalıcı video/ses/ek dosyaları | Private Railway Bucket |

## Sistem mimarisi

```text
Tarayıcı
  │
  ├─ HTTPS ──> Hazalhost/cPanel statik Vite build'i
  │              └─ index.html + dist/assets/*
  │
  └─ HTTPS ──> Railway Express API
                 ├─ Supabase Auth + Postgres
                 ├─ Gemini/Groq plan ve Manim kodu
                 ├─ Edge/Google TTS
                 ├─ Manim + FFmpeg render
                 └─ Private Railway Bucket
                       └─ süreli signed URL ile tarayıcı
```

Node.js tarayıcıda çalışan uygulamanın yerine geçmez. Geliştirme ve build
araçlarını çalıştırır:

```text
npm run dev
  → Node.js Vite'ı çalıştırır
  → Vite index.html'i sunar
  → index.html /src/main.tsx'i yükler
  → React uygulamayı #root içine render eder
  → legacy/app.js ders, auth ve oynatma akışını bağlar
```

Production build sırasında TypeScript kontrol edilir, JavaScript/CSS
küçültülür, dosya adlarına cache hash'i eklenir ve `dist/` oluşturulur.

## Frontend kod haritası

```text
src/
├── main.tsx                         API adresi, React başlangıcı, MathJax ayarı
├── App.tsx                          AuthGate + Workspace ve legacy yükleyici
├── components/
│   ├── AuthGate.tsx                 e-posta/şifre ve Google OAuth arayüzü
│   ├── Workspace.tsx                ana uygulama kabuğu
│   └── workspace/
│       ├── HomeView.tsx             karşılama/prompt ekranı
│       ├── Sidebar.tsx              ders geçmişi
│       └── StudioView.tsx           plan, segment, chat ve video alanı
├── legacy/
│   ├── app.js                       API, auth, job, geçmiş ve UI orkestrasyonu
│   └── progressiveManimPlayer.js    MediaSource/fMP4 canlı oynatıcı
└── styles/
    ├── base.css
    └── theme.css
```

`src/legacy/app.js` halen uygulamanın davranış katmanıdır. Bir ekranı React
bileşeninde değiştirirken bu dosyanın ilgili DOM seçicileri ve event
bağlantıları da korunmalıdır. ID'leri kontrol etmeden kaldırmak auth, chat veya
video akışını sessizce bozabilir.

## Ders üretimi ve canlı oynatma

1. Frontend promptu `POST /api/generate-lesson` ile backend'e gönderir.
2. Streaming-plan özelliği açıksa backend ilk geçerli segment çıkar çıkmaz
   `202` ve job bilgisini döndürür; kalan plan arka planda tamamlanır.
3. Frontend job durumunu `/api/jobs/:id/events` SSE akışından izler. Bağlantı
   kullanılamazsa `/api/jobs/:id` sorgulaması geri dönüş yoludur.
4. Manim'in tamamlanmış `partial_movie_files` parçaları
   `/api/jobs/:id/stream-manifest` üzerinden sırayla alınır.
5. `progressiveManimPlayer.js`, doğrulanmış fMP4 parçalarını MediaSource'a
   ekler. Tampon hedefi dolunca canlı video oynar.
6. Arkadaki segmentler üretildikçe aynı zaman çizgisine eklenir. Progressive
   akış başarısız olursa arayüz final videoyu bekler.
7. Bütün segmentler bitince backend final MP4'ü birleştirir, Railway Bucket'a
   yükler ve Supabase'deki derse bağlar.
8. Geçmiş açılırken video ders ID'sine göre getirilir. Private bucket URL'si
   süresi dolmuşsa `/api/lessons/:id/video-url` yeni signed URL üretir.

Canlı partial dosyalar kalıcı kayıt değildir. Kalıcı geçmişte final video ve
Supabase ders kaydı kullanılır.

## Auth ve veri güvenliği

Frontend Supabase secret/service-role anahtarı taşımaz. Kayıt, giriş, session
yenileme, Google OAuth ve şifre sıfırlama istekleri Railway backend
endpointlerine gider. Frontend yalnız kullanıcı session/access token'ını
saklar ve korumalı API isteklerinde `Authorization: Bearer ...` gönderir.

Railway Bucket erişim anahtarları da hiçbir zaman Vite ortam değişkenlerine
eklenmemelidir. Video erişimi backend'in ürettiği kısa ömürlü signed URL ile
yapılır.

## Yerel geliştirme

Node.js `20.19+` gerekir.

```bash
npm ci
cp .env.example .env
npm run dev
```

Uygulama `http://localhost:3001` adresinde açılır. Vite geliştirme sunucusu
`/api` ve `/renders` isteklerini Railway backend'e proxy ettiği için
`VITE_API_BASE_URL` boş bırakılırsa local geliştirmede aynı-origin yolları
kullanılabilir.

Railway production API'sini açıkça kullanmak için:

```env
VITE_API_BASE_URL=https://karatahta-backend-production.up.railway.app
```

Tamamen local backend kullanmak için `vite.config.js` içindeki proxy hedefini
`http://localhost:8080` yapın veya uygun bir local Vite env değeri kullanın.
Production'a local URL commitlenmemelidir.

## Kontroller

Her frontend değişikliğinden sonra:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

`npm run build`, cPanel'in yayınlayacağı `dist/` klasörünü yeniler. Bu repoda
`dist/` bilinçli olarak Git tarafından takip edilir.

## Hazalhost/cPanel deployment — önemli

`.cpanel.yml` **npm install veya Vite build çalıştırmaz**. Yalnız repoda hazır
bulunan `dist/` içeriğini şu yayın dizinine kopyalar:

```text
$HOME/karatahta.ethosoft.org/
```

Bu nedenle kaynak dosyalar ile `dist/` aynı committe güncel olmalıdır:

```bash
git switch main
git pull --ff-only origin main
npm ci
npm test
npm run build
git add src public index.html dist package.json package-lock.json .cpanel.yml README.md
git commit -m "..."
git push origin main
```

Ardından cPanel > **Git Version Control** içindeki frontend reposunda sırayla:

1. **Update from Remote**
2. cPanel'deki `HEAD` commitinin GitHub `origin/main` son commitine eşit
   olduğunu kontrol et
3. **Deploy HEAD Commit**

Yalnız “Deploy HEAD Commit” demek yeni GitHub commitini çekmez. Yalnız
“Update from Remote” demek de dosyaları web dizinine yayınlamaz. İki işlem de
bu sırayla yapılmalıdır.

cPanel repo kaydı şu remote'u ve branch'i izlemelidir:

```text
Remote: https://github.com/ethosoftai/karatahta-frontend.git
Branch: main
Deploy edilen commit: HEAD == origin/main
```

Eski arayüz görünüyorsa önce cPanel'deki HEAD SHA ile GitHub `main` SHA'sını
karşılaştırın. SHA'lar eşitse `dist/index.html` içindeki hashed asset
isimlerinin yayın dizinindekilerle aynı olduğunu kontrol edin ve tarayıcı/CDN
cache'ini temizleyin. `public_html` veya yayın dizininde elle yapılan
değişiklikler sonraki deploy'da ezilir; kalıcı değişiklik mutlaka bu repoya
commitlenmelidir.

## Backend değişiklikleriyle birlikte çalışma

API response, auth, SSE veya progressive manifest sözleşmesi değiştiğinde:

1. Backend değişikliğini `ethosoftai/karatahta-backend` reposunun `railway`
   branch'ine commit/push et.
2. Railway deployment'ın aynı commit ile başarılı olduğunu doğrula.
3. Gerekli frontend uyarlamasını bu repoda yap.
4. Frontend test/build sonrası kaynaklarla birlikte `dist/`yi commit et.
5. `main` branch'ini pushla.
6. cPanel'de **Update from Remote**, sonra **Deploy HEAD Commit** yap.

Backend'in CORS listesinde hem production origin'i hem gerekli local
origin'ler bulunmalıdır:

```env
CORS_ORIGIN=https://karatahta.ethosoft.org,http://localhost:3001,http://127.0.0.1:3001
```

## Hızlı sorun giderme

- `No Access-Control-Allow-Origin`: Railway `CORS_ORIGIN` eksik veya yanlış.
- Arayüz eski: cPanel remote güncellenmemiş, HEAD eski veya `dist/` build
  edilmeden pushlanmış.
- Canlı video bekliyor: `/api/config` içindeki progressive flag'leri ve job
  SSE/manifest yanıtlarını kontrol et.
- Geçmişte yanlış video: UI state'i değil `lesson.id` ve
  `/api/lessons/:id` yanıtındaki video kaydını kullan.
- Signed video açılmıyor: Railway Bucket CORS ayarını ve
  `/api/lessons/:id/video-url` yanıtını kontrol et.
- Login sürekli dönüyor: backend auth ayarları, Supabase redirect URL'leri ve
  session refresh isteğini kontrol et.

## Sonraki geliştirici/LLM için teslim kontrol listesi

- İşe başlamadan `git status -sb`, `git remote -v` ve son commitleri kontrol et.
- Backend sözleşmesini varsayma; `/api/config` ve ilgili endpoint kodunu oku.
- React bileşen ID'leri ile `legacy/app.js` seçicilerini birlikte değiştir.
- Progressive oynatmayı kaldırırken final-video fallback'ini bozma.
- Secret veya bucket credential'ını frontend'e ekleme.
- Teslimden önce test, typecheck ve build çalıştır.
- `dist/` değişmişse kaynaklarla aynı committe gönder.
- Push sonrası cPanel remote/HEAD eşitliğini ve gerçek production arayüzünü
  doğrula.
