# WhatsApp Bot - Berber Randevu Sistemi

## Gereksinimler

- Python 3.8 veya uzeri
- Google Chrome tarayicisi

## Kurulum

### 1. Python Kurulumu

https://www.python.org/downloads/ adresinden Python'u indirin ve kurun. Kurulum sirasinda "Add Python to PATH" secenegini isaretleyin.

### 2. Chrome Kurulumu

https://www.google.com/chrome/ adresinden Google Chrome'u indirin ve kurun.

### 3. Bot Kurulumu

`run.bat` dosyasina cift tiklayin. Script su islemleri otomatik yapar:

- Virtual environment olusturur
- Gerekli paketleri yukler
- API sunucusunu baslatir

### 4. Ilk Calistirma - QR Kod Tarama

Ilk calistirmada Chrome penceresi acilacak ve WhatsApp Web QR kodu gorunecektir.

1. Telefonunuzda WhatsApp'i acin
2. Ayarlar > Bagli Cihazlar > Cihaz Bagla yolunu izleyin
3. QR kodu telefonunuzla tarayin
4. Oturum `chrome_session` klasorunde kaydedilir, sonraki baslatmalarda tekrar taramaya gerek kalmaz

## API Kullanimi

API sunucusu `http://localhost:5000` adresinde calisir.

### Saglik Kontrolu

```
GET http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "message": "WhatsApp Bot API calisiyor."
}
```

### Mesaj Gonderme

```
POST http://localhost:5000/send
Content-Type: application/json

{
  "phone": "+905xxxxxxxxx",
  "message": "Merhaba, bu bir test mesaji."
}
```

Response:
```json
{
  "success": true,
  "message": "Mesaj basariyla gonderildi."
}
```

### Mesaj Sablonlari

`message_templates.py` modulu icinde uc hazir sablon bulunur:

- `get_confirmation_message(customer_name, date, time, service)`: Randevu onay mesaji
- `get_reminder_message(customer_name, date, time)`: Randevu hatirlatma mesaji
- `get_cancellation_message(customer_name, date, time)`: Randevu iptal mesaji

Ornek kullanim:

```python
from message_templates import get_confirmation_message

msg = get_confirmation_message("Ahmet Yilmaz", "2024-01-15", "14:30", "Sac Kesimi")
```

## Proje Yapisi

```
whatsapp-bot/
├── whatsapp_bot.py        # Ana WhatsApp bot modulu
├── api_server.py          # Flask API sunucusu
├── message_templates.py   # Mesaj sablonlari
├── requirements.txt       # Python bagimliliklari
├── run.bat                # Windows calistirma scripti
├── README.md              # Bu dosya
└── chrome_session/        # Oturum verileri (otomatik olusur)
```
