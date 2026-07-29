# Kara Tahta Frontend

Kara Tahta'nın Vite, React ve TypeScript tabanlı web arayüzü.

## Mimari

```text
npm run dev
  → Node.js Vite'ı çalıştırır
  → Vite index.html'i sunar
  → index.html /src/main.tsx'i yükler
  → React uygulamayı #root içine render eder
  → çalışan ders üretim motoru ayrı bir chunk olarak gecikmeli yüklenir
```

Production build sırasında TypeScript kontrol edilir, JavaScript/CSS küçültülür,
dosya adlarına cache hash'i eklenir ve `dist/` klasörü oluşturulur.

## Yerel geliştirme

Node.js 20.19 veya üstü gerekir.

```bash
npm ci
cp .env.example .env
npm run dev
```

Uygulama `http://localhost:3001` adresinde açılır.
Geliştirme sunucusu `/api` ve `/renders` isteklerini Railway backend'e proxy
ettiği için yerel geliştirmede CORS ayarı gerekmez.

## Kontroller

```bash
npm run typecheck
npm run build
npm run preview
```

## Hazalhost/cPanel deployment

`.cpanel.yml`, cPanel deployment sırasında bağımlılıkları kurar, production
build alır ve `dist/` içeriğini `/home/ethosoft/karatahta.ethosoft.org/`
klasörüne kopyalar.

cPanel'de mümkünse Node.js **22**, yoksa güncel Node.js **20** seçin. Ardından
Git Version Control ekranında:

1. **Update from Remote**
2. **Deploy HEAD Commit**

Frontend API adresi `.env` dosyasındaki `VITE_API_BASE_URL` ile değiştirilebilir.
Bu değişken yoksa production Railway backend adresi kullanılır.
