# Berber Randevu Sistemi

Berber dukkanlari icin tam kapsamli randevu yonetim sistemi.

## Ozellikler

- Musteri randevu alma (web sitesi uzerinden)
- Admin paneli (randevu yonetimi, hizmet yonetimi, ayarlar)
- WhatsApp otomatik mesaj gonderimi (randevu olusturulunca)
- Randevu hatirlatma (2 saat once otomatik WhatsApp mesaji)
- Admin panelinden manuel WhatsApp mesaji gonderme
- Arama butonu (tek tikla musteri arama)

## Teknolojiler

- **Backend:** Node.js, Express, SQLite
- **Frontend:** HTML, CSS, JavaScript
- **WhatsApp:** whatsapp-web.js (headless)
- **Scheduler:** node-cron

## Kurulum

```bash
cd backend
npm install
npm start
```

## Calistirma

1. Backend: `cd backend && npm start`
2. Ilk calistirmada terminalde QR kod gorunur - telefonunuzdan tarayin
3. Musteri sayfasi: `frontend/index.html`
4. Admin paneli: `frontend/admin/login.html` (sifre: admin123)

## WhatsApp Ayarlari

Admin panelinden Ayarlar > WhatsApp Bildirimleri aktif edin.

## Ortam Degiskenleri

`.env` dosyasi olusturun:

```
PORT=3000
```
