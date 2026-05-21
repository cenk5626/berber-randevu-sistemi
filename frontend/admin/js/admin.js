const API_BASE = 'http://localhost:3000/api';

const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

function getGunAdi(dateStr) {
    const d = new Date(dateStr);
    return gunler[d.getDay()];
}

if (localStorage.getItem('adminSession') !== 'true') {
    window.location.href = 'login.html';
}

const pages = {
    dashboard: document.getElementById('dashboard'),
    appointments: document.getElementById('appointments'),
    services: document.getElementById('services'),
    settings: document.getElementById('settings')
};

const navLinks = document.querySelectorAll('.nav-link');
const pageTitle = document.getElementById('pageTitle');
const pageTitles = {
    dashboard: 'Dashboard',
    appointments: 'Randevular',
    services: 'Hizmetler',
    settings: 'Ayarlar'
};

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        switchPage(page);
    });
});

function switchPage(page) {
    Object.keys(pages).forEach(key => {
        pages[key].classList.remove('active');
    });
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });
    pages[page].classList.add('active');
    pageTitle.textContent = pageTitles[page];
    if (page === 'dashboard') loadDashboard();
    if (page === 'appointments') loadAppointments();
    if (page === 'services') loadServices();
    if (page === 'settings') loadSettings();
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminLoginTime');
    window.location.href = 'login.html';
});

async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}

function getStatusBadge(status) {
    const statusMap = {
        pending: 'Beklemede',
        confirmed: 'Onaylandı',
        cancelled: 'İptal Edildi',
        completed: 'Tamamlandı'
    };
    return `<span class="badge badge-${status}">${statusMap[status] || status}</span>`;
}

async function loadDashboard() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [todayRes, pendingRes, allRes] = await Promise.all([
            apiFetch(`/appointments?date=${today}`),
            apiFetch('/appointments?status=pending'),
            apiFetch('/appointments')
        ]);

        const todayAppointments = todayRes.data || [];
        const pendingAppointments = pendingRes.data || [];
        const allAppointments = allRes.data || [];

        document.getElementById('todayAppointments').textContent = todayAppointments.length;
        document.getElementById('pendingAppointments').textContent = pendingAppointments.length;
        document.getElementById('totalAppointments').textContent = allAppointments.length;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const completedThisMonth = allAppointments.filter(a => {
            const status = a.status;
            const date = new Date(a.appointment_date);
            return status === 'completed' && date >= monthStart;
        });
        const servicesRes = await apiFetch('/services');
        const services = servicesRes.data || [];
        const servicePrices = {};
        services.forEach(s => { servicePrices[s.name] = s.price; });
        const monthlyRevenue = completedThisMonth.reduce((sum, a) => sum + (servicePrices[a.service_type] || 0), 0);
        document.getElementById('monthlyRevenue').textContent = `₺${monthlyRevenue.toFixed(2)}`;

        const recent = allAppointments.slice(-10).reverse();
        const recentTable = document.getElementById('recentAppointmentsTable');
        recentTable.innerHTML = recent.map(a => `
            <tr>
                <td>${a.customer_name || '-'}</td>
                <td>${a.customer_phone || '-'}</td>
                <td>${a.service_type || '-'}</td>
                <td>${formatDateTime(a.appointment_date, a.appointment_time)}</td>
                <td>${getStatusBadge(a.status)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Dashboard yüklenemedi:', error);
    }
}

function formatDateTime(date, time) {
    if (!date) return '-';
    const d = new Date(date);
    const formatted = d.toLocaleDateString('tr-TR');
    return time ? `${formatted} ${time}` : formatted;
}

async function loadAppointments() {
    try {
        const res = await apiFetch('/appointments');
        const appointments = res.data || [];
        renderAppointmentsTable(appointments);
    } catch (error) {
        console.error('Randevular yüklenemedi:', error);
    }
}

function renderAppointmentsTable(appointments) {
    const table = document.getElementById('appointmentsTable');
    if (appointments.length === 0) {
        table.innerHTML = '<tr><td colspan="8" style="text-align: center;">Randevu bulunamadı</td></tr>';
        return;
    }
    table.innerHTML = appointments.map(a => `
        <tr>
            <td>${a.id || '-'}</td>
            <td>${a.customer_name || '-'}</td>
            <td>${a.customer_phone || '-'}</td>
            <td>${a.service_type || '-'}</td>
            <td>${a.appointment_date || '-'}</td>
            <td>${a.appointment_time || '-'}</td>
            <td>
                <select class="status-select" data-id="${a.id}" onchange="updateAppointmentStatus('${a.id}', this.value)">
                    <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>Beklemede</option>
                    <option value="confirmed" ${a.status === 'confirmed' ? 'selected' : ''}>Onaylandı</option>
                    <option value="cancelled" ${a.status === 'cancelled' ? 'selected' : ''}>İptal Edildi</option>
                    <option value="completed" ${a.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                </select>
            </td>
            <td>
                <div class="action-btns">
                    <input type="text" class="whatsapp-msg-input" id="wp-msg-${a.id}" placeholder="Mesaj yaz...">
                    <button class="btn btn-whatsapp btn-sm" onclick="sendWhatsApp('${a.customer_phone}', '${a.customer_name}', '${a.appointment_date}', '${a.appointment_time}', '${a.service_type}', '${a.id}')">WP</button>
                    <button class="btn btn-call btn-sm" onclick="callCustomer('${a.customer_phone}')">📞</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteAppointment('${a.id}')">Sil</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function updateAppointmentStatus(id, status) {
    try {
        await apiFetch(`/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        loadAppointments();
    } catch (error) {
        console.error('Durum güncellenemedi:', error);
        alert('Durum güncellenirken hata oluştu');
    }
}

async function deleteAppointment(id) {
    if (!confirm('Bu randevuyu silmek istediğinize emin misiniz?')) return;
    try {
        await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
        loadAppointments();
    } catch (error) {
        console.error('Randevu silinemedi:', error);
        alert('Randevu silinirken hata oluştu');
    }
}

let servicePrices = {};

async function loadServicePrices() {
    try {
        const res = await apiFetch('/services');
        const services = res.data || [];
        services.forEach(s => { servicePrices[s.name] = s.price; });
    } catch (error) {
        console.error('Hizmet fiyatları yüklenemedi:', error);
    }
}

async function sendWhatsApp(phone, name, date, time, service, rowId) {
    if (!phone) {
        alert('Telefon numarası bulunamadı');
        return;
    }
    let formattedPhone = phone.trim().replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '+90' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+90' + formattedPhone;
    }
    const price = servicePrices[service] || 0;
    const gunAdi = getGunAdi(date);
    const customMsg = document.getElementById(`wp-msg-${rowId}`)?.value?.trim();
    const message = customMsg || `Sayın ${name}, ${date} ${gunAdi} günü saat ${time}'de ${service} randevunuz bulunmaktadır. Ücreti ${price}₺'dir. Randevu saatinizde dükkanımızda bulununuz. İptal veya değişiklik için bizimle iletişime geçiniz.`;
    try {
        const response = await fetch(`${API_BASE}/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: formattedPhone, message })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            alert('WhatsApp mesajı gönderildi');
        } else {
            alert('WhatsApp hatası: ' + (data.message || 'Bilinmeyen hata'));
        }
    } catch (error) {
        console.error('WhatsApp mesajı gönderilemedi:', error);
        alert('WhatsApp bağlantısı yok. Terminalde QR kodu tarayın.');
    }
}

function callCustomer(phone) {
    window.open(`tel:${phone}`, '_self');
}

document.getElementById('applyFilter').addEventListener('click', async () => {
    const date = document.getElementById('filterDate').value;
    const status = document.getElementById('filterStatus').value;
    let url = '/appointments?';
    if (date) url += `date=${date}&`;
    if (status) url += `status=${status}&`;
    try {
        const res = await apiFetch(url);
        const appointments = res.data || [];
        renderAppointmentsTable(appointments);
    } catch (error) {
        console.error('Filtreleme hatası:', error);
    }
});

document.getElementById('clearFilter').addEventListener('click', () => {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterStatus').value = '';
    loadAppointments();
});

async function loadServices() {
    try {
        const res = await apiFetch('/services');
        const services = res.data || [];
        renderServicesTable(services);
    } catch (error) {
        console.error('Hizmetler yüklenemedi:', error);
    }
}

function renderServicesTable(services) {
    const table = document.getElementById('servicesTable');
    if (services.length === 0) {
        table.innerHTML = '<tr><td colspan="5" style="text-align: center;">Hizmet bulunamadı</td></tr>';
        return;
    }
    table.innerHTML = services.map(s => `
        <tr>
            <td>${s.id || '-'}</td>
            <td>${s.name || '-'}</td>
            <td>${s.duration_minutes || '-'} dk</td>
            <td>₺${s.price || '0'}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-primary btn-sm" onclick="editService('${s.id}')">Düzenle</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteService('${s.id}')">Sil</button>
                </div>
            </td>
        </tr>
    `).join('');
}

document.getElementById('addServiceBtn').addEventListener('click', () => {
    document.getElementById('serviceModalTitle').textContent = 'Yeni Hizmet Ekle';
    document.getElementById('serviceId').value = '';
    document.getElementById('serviceName').value = '';
    document.getElementById('serviceDuration').value = '';
    document.getElementById('servicePrice').value = '';
    document.getElementById('serviceModal').classList.add('active');
});

document.getElementById('closeServiceModal').addEventListener('click', () => {
    document.getElementById('serviceModal').classList.remove('active');
});

document.getElementById('serviceModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('serviceModal')) {
        document.getElementById('serviceModal').classList.remove('active');
    }
});

async function editService(id) {
    try {
        const res = await apiFetch('/services');
        const services = res.data || [];
        const service = services.find(s => s.id == id);
        if (!service) {
            alert('Hizmet bulunamadı');
            return;
        }
        document.getElementById('serviceModalTitle').textContent = 'Hizmet Düzenle';
        document.getElementById('serviceId').value = service.id;
        document.getElementById('serviceName').value = service.name || '';
        document.getElementById('serviceDuration').value = service.duration_minutes || '';
        document.getElementById('servicePrice').value = service.price || '';
        document.getElementById('serviceModal').classList.add('active');
    } catch (error) {
        console.error('Hizmet yüklenemedi:', error);
    }
}

async function deleteService(id) {
    if (!confirm('Bu hizmeti silmek istediğinize emin misiniz?')) return;
    try {
        await apiFetch(`/services/${id}`, { method: 'DELETE' });
        loadServices();
    } catch (error) {
        console.error('Hizmet silinemedi:', error);
        alert('Hizmet silinirken hata oluştu');
    }
}

document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('serviceId').value;
    const data = {
        name: document.getElementById('serviceName').value,
        duration_minutes: parseInt(document.getElementById('serviceDuration').value),
        price: parseFloat(document.getElementById('servicePrice').value)
    };
    try {
        if (id) {
            await apiFetch(`/services/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            await apiFetch('/services', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        document.getElementById('serviceModal').classList.remove('active');
        loadServices();
    } catch (error) {
        console.error('Hizmet kaydedilemedi:', error);
        alert('Hizmet kaydedilirken hata oluştu');
    }
});

async function loadSettings() {
    try {
        const res = await apiFetch('/settings');
        const settings = res.data || {};
        document.getElementById('barberName').value = settings.shop_name || '';
        document.getElementById('barberPhone').value = settings.shop_phone || '';
        document.getElementById('barberAddress').value = settings.shop_address || '';
        document.getElementById('workStart').value = settings.working_hours_start || '09:00';
        document.getElementById('workEnd').value = settings.working_hours_end || '18:00';
        document.getElementById('slotDuration').value = settings.slot_duration || 30;
        document.getElementById('whatsappEnabled').checked = settings.whatsapp_enabled === 1;
    } catch (error) {
        console.error('Ayarlar yüklenemedi:', error);
    }
}

document.getElementById('barberInfoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        shop_name: document.getElementById('barberName').value,
        shop_phone: document.getElementById('barberPhone').value,
        shop_address: document.getElementById('barberAddress').value
    };
    try {
        await apiFetch('/settings', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        alert('Berber bilgileri kaydedildi');
    } catch (error) {
        console.error('Kayıt hatası:', error);
        alert('Kayıt sırasında hata oluştu');
    }
});

document.getElementById('workingHoursForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        working_hours_start: document.getElementById('workStart').value,
        working_hours_end: document.getElementById('workEnd').value,
        slot_duration: parseInt(document.getElementById('slotDuration').value)
    };
    try {
        await apiFetch('/settings', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        alert('Çalışma saatleri kaydedildi');
    } catch (error) {
        console.error('Kayıt hatası:', error);
        alert('Kayıt sırasında hata oluştu');
    }
});

document.getElementById('whatsappSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        whatsapp_enabled: document.getElementById('whatsappEnabled').checked ? 1 : 0
    };
    try {
        await apiFetch('/settings', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        alert('WhatsApp ayarları kaydedildi');
    } catch (error) {
        console.error('Kayıt hatası:', error);
        alert('Kayıt sırasında hata oluştu');
    }
});

loadDashboard();
loadServicePrices();
