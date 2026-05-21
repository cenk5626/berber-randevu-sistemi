const API_BASE = 'http://localhost:3000/api';

const elements = {
    navToggle: document.querySelector('.nav-toggle'),
    navMenu: document.querySelector('.nav-menu'),
    navLinks: document.querySelectorAll('.nav-link'),
    randevuModal: document.getElementById('randevu-modal'),
    randevuAcBtn: document.getElementById('randevu-ac-btn'),
    heroRandevuBtn: document.getElementById('hero-randevu-btn'),
    modalKapat: document.getElementById('modal-kapat'),
    randevuForm: document.getElementById('randevu-form'),
    hizmetSelect: document.getElementById('hizmet'),
    tarihInput: document.getElementById('tarih'),
    saatGrubu: document.getElementById('saat-grubu'),
    saatSlotlari: document.getElementById('saat-slotlari'),
    saatInput: document.getElementById('saat'),
    formGonderBtn: document.getElementById('form-gonder-btn'),
    formMesaj: document.getElementById('form-mesaj'),
    hizmetlerListesi: document.getElementById('hizmetler-listesi'),
};

function init() {
    setMinDate();
    loadSettings();
    loadHizmetler();
    setupEventListeners();
    setupScrollAnimations();
}

function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    elements.tarihInput.min = today;
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        if (!response.ok) throw new Error('Ayarlar yüklenemedi');
        const result = await response.json();
        const ayarlar = result.data || result;

        const berberAdi = ayarlar.shop_name || 'Berber';
        document.getElementById('nav-berber-adi').textContent = berberAdi;
        document.getElementById('footer-berber-adi').textContent = berberAdi;
        document.getElementById('footer-berber-adi-alt').textContent = berberAdi;
        document.title = `${berberAdi} - Randevu Sistemi`;

        const baslangic = ayarlar.working_hours_start || '09:00';
        const bitis = ayarlar.working_hours_end || '18:00';
        document.getElementById('iletisim-saatler').textContent = `${baslangic} - ${bitis}`;
        if (ayarlar.shop_phone) document.getElementById('iletisim-telefon').textContent = ayarlar.shop_phone;
        if (ayarlar.shop_address) document.getElementById('iletisim-adres').textContent = ayarlar.shop_address;

        document.getElementById('footer-yil').textContent = new Date().getFullYear();
    } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error);
    }
}

async function loadHizmetler() {
    try {
        const response = await fetch(`${API_BASE}/services`);
        if (!response.ok) throw new Error('Hizmetler yüklenemedi');
        const result = await response.json();
        const hizmetler = result.data || [];

        renderHizmetler(hizmetler);
        populateHizmetSelect(hizmetler);
    } catch (error) {
        console.error('Hizmetler yüklenirken hata:', error);
        elements.hizmetlerListesi.innerHTML = '<p class="error-message">Hizmetler yüklenirken bir hata oluştu.</p>';
    }
}

function renderHizmetler(hizmetler) {
    if (!hizmetler.length) {
        elements.hizmetlerListesi.innerHTML = '<p>Henüz hizmet eklenmemiş.</p>';
        return;
    }

    elements.hizmetlerListesi.innerHTML = hizmetler.map(hizmet => `
        <div class="hizmet-kart fade-in">
            <h3>${hizmet.name}</h3>
            <div class="hizmet-detay">
                <span class="hizmet-fiyat">${hizmet.price}₺</span>
                <span class="hizmet-sure">&#9201; ${hizmet.duration_minutes} dk</span>
            </div>
        </div>
    `).join('');
}

function populateHizmetSelect(hizmetler) {
    elements.hizmetSelect.innerHTML = '<option value="">Hizmet seçiniz...</option>';
    hizmetler.forEach(hizmet => {
        const option = document.createElement('option');
        option.value = hizmet.name;
        option.textContent = `${hizmet.name} - ${hizmet.price}₺ (${hizmet.duration_minutes} dk)`;
        elements.hizmetSelect.appendChild(option);
    });
}

async function loadMüsaitSaatler(tarih) {
    elements.saatGrubu.style.display = 'block';
    elements.saatSlotlari.innerHTML = '<div class="loading-spinner-small"><div class="spinner-small"></div></div>';
    elements.saatInput.value = '';

    try {
        const response = await fetch(`${API_BASE}/appointments/available?date=${tarih}`);
        if (!response.ok) throw new Error('Saatler yüklenemedi');
        const result = await response.json();
        const saatler = result.data?.available || [];

        if (!saatler.length) {
            elements.saatSlotlari.innerHTML = '<p class="text-muted">Bu tarih için müsait saat bulunmamaktadır.</p>';
            return;
        }

        elements.saatSlotlari.innerHTML = saatler.map(saat => `
            <button type="button" class="saat-slot" data-saat="${saat}">${saat}</button>
        `).join('');

        document.querySelectorAll('.saat-slot').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.saat-slot').forEach(b => b.classList.remove('secili'));
                btn.classList.add('secili');
                elements.saatInput.value = btn.dataset.saat;
            });
        });
    } catch (error) {
        console.error('Saatler yüklenirken hata:', error);
        elements.saatSlotlari.innerHTML = '<p class="text-muted">Saatler yüklenirken bir hata oluştu.</p>';
    }
}

function openModal() {
    elements.randevuModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.randevuModal.classList.remove('active');
    document.body.style.overflow = '';
    resetForm();
}

function resetForm() {
    elements.randevuForm.reset();
    elements.saatGrubu.style.display = 'none';
    elements.saatSlotlari.innerHTML = '';
    elements.saatInput.value = '';
    elements.formMesaj.className = 'form-mesaj';
    elements.formMesaj.textContent = '';
    elements.formGonderBtn.disabled = false;
    elements.formGonderBtn.textContent = 'Randevu Oluştur';
}

function showMesaj(mesaj, tip) {
    elements.formMesaj.textContent = mesaj;
    elements.formMesaj.className = `form-mesaj ${tip}`;
}

function setupEventListeners() {
    elements.navToggle.addEventListener('click', () => {
        elements.navToggle.classList.toggle('active');
        elements.navMenu.classList.toggle('active');
    });

    elements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            elements.navToggle.classList.remove('active');
            elements.navMenu.classList.remove('active');
        });
    });

    elements.randevuAcBtn.addEventListener('click', openModal);
    elements.heroRandevuBtn.addEventListener('click', openModal);
    elements.modalKapat.addEventListener('click', closeModal);

    elements.randevuModal.addEventListener('click', (e) => {
        if (e.target === elements.randevuModal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.randevuModal.classList.contains('active')) {
            closeModal();
        }
    });

    elements.tarihInput.addEventListener('change', () => {
        const tarih = elements.tarihInput.value;
        if (tarih) {
            loadMüsaitSaatler(tarih);
        }
    });

    elements.hizmetSelect.addEventListener('change', () => {
        const tarih = elements.tarihInput.value;
        if (tarih) {
            loadMüsaitSaatler(tarih);
        }
    });

    elements.randevuForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const adSoyad = document.getElementById('ad-soyad').value.trim();
        const telefon = document.getElementById('telefon').value.trim();
        const email = document.getElementById('email').value.trim();
        const hizmet = elements.hizmetSelect.value;
        const tarih = elements.tarihInput.value;
        const saat = elements.saatInput.value;

        if (!adSoyad) {
            showMesaj('Lütfen ad soyad giriniz.', 'hata');
            return;
        }

        if (!telefon || telefon.length < 10) {
            showMesaj('Lütfen geçerli bir telefon numarası giriniz.', 'hata');
            return;
        }

        if (!hizmet) {
            showMesaj('Lütfen bir hizmet seçiniz.', 'hata');
            return;
        }

        if (!tarih) {
            showMesaj('Lütfen bir tarih seçiniz.', 'hata');
            return;
        }

        if (!saat) {
            showMesaj('Lütfen bir saat seçiniz.', 'hata');
            return;
        }

        elements.formGonderBtn.disabled = true;
        elements.formGonderBtn.textContent = 'Gönderiliyor...';

        try {
            const response = await fetch(`${API_BASE}/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: adSoyad,
                    customer_phone: telefon,
                    customer_email: email || null,
                    service_type: hizmet,
                    appointment_date: tarih,
                    appointment_time: saat
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showMesaj('Randevunuz başarıyla oluşturuldu!', 'basarili');
                setTimeout(() => closeModal(), 2000);
            } else {
                showMesaj(data.message || 'Randevu oluşturulurken bir hata oluştu.', 'hata');
                elements.formGonderBtn.disabled = false;
                elements.formGonderBtn.textContent = 'Randevu Oluştur';
            }
        } catch (error) {
            showMesaj('Bağlantı hatası. Lütfen tekrar deneyiniz.', 'hata');
            elements.formGonderBtn.disabled = false;
            elements.formGonderBtn.textContent = 'Randevu Oluştur';
        }
    });
}

function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.hizmet-kart, .galeri-item, .info-item, .stat').forEach(el => {
        observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', init);
