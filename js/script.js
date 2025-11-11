// ===================================================================
// KONFIGURASI GLOBAL
// ===================================================================
const BASE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwhC_D1Se7nICRIRb0EmJivCuBT3v3U7xtGxAvKFh0TOCExyAp7A8moD9TTcyHYpm6mOw/exec';
let customerDataForDropdown = [];

// ===================================================================
// FUNGSI PEMBANTU (HELPER)
// ===================================================================

/**
 * Fungsi untuk memanggil backend Google Apps Script - VERSI DIPERBAIKI
 */
/**
 * Fungsi untuk memanggil backend Google Apps Script - VERSI DIPERBAIKI
 */
async function callBackend(action, params = {}) {
    if (!action) {
        console.error('callBackend: action kosong.');
        return { success: false, message: 'Internal error: action kosong.' };
    }

    console.log(`🔗 Calling backend: ${action}`, params);

    // SELALU gunakan FormData untuk konsistensi
    try {
        const formData = new URLSearchParams();
        formData.append('action', action);
        
        // Tambahkan semua parameter ke formData
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                formData.append(key, params[key]);
            }
        });

        console.log('📤 Sending form data:', formData.toString());

        const response = await fetch(BASE_APP_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: formData.toString()
        });

        const text = await response.text();
        console.log('📥 Response status:', response.status);
        console.log('📥 Response text:', text);

        try {
            const result = JSON.parse(text);
            console.log('✅ JSON parsed successfully');
            return result;
        } catch (e) {
            console.error('❌ JSON parse error:', e);
            return { 
                success: false, 
                message: 'Invalid server response',
                rawResponse: text
            };
        }
    } catch (error) {
        console.error('❌ Network error:', error);
        return { 
            success: false, 
            message: 'Network error: ' + error.message 
        };
    }
}
/**
 * Menampilkan pesan modal
 */
function displayMessage(message, type = 'info', duration = 4000) {
    try {
        const existingModal = document.querySelector('.custom-modal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.classList.add('custom-modal');
        modal.innerHTML = `
            <div class="modal-content ${type}">
                <span class="close-button">×</span>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('.close-button').onclick = () => modal.remove();
        setTimeout(() => { 
            if (document.body.contains(modal)) modal.remove(); 
        }, duration);
    } catch (e) {
        console.error('displayMessage error:', e);
    }
}

/**
 * Menampilkan konfirmasi custom
 */
function showCustomConfirm(message, onConfirm) {
    try {
        const modal = document.createElement('div');
        modal.classList.add('custom-modal');
        modal.innerHTML = `
            <div class="modal-content confirm">
                <p>${message}</p>
                <div class="modal-buttons">
                    <button id="confirmYes" class="button">Ya</button>
                    <button id="confirmNo" class="button cancel">Tidak</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const yesBtn = modal.querySelector('#confirmYes');
        const noBtn = modal.querySelector('#confirmNo');
        
        yesBtn.onclick = () => { 
            try { 
                onConfirm(); 
            } catch(e){ 
                console.error(e); 
            } 
            modal.remove(); 
        };
        noBtn.onclick = () => modal.remove();
    } catch (e) {
        console.error('showCustomConfirm error:', e);
    }
}

/**
 * Setup tombol kembali
 */
function setupBackButton() {
    const backButton = document.getElementById('backToDashboardBtn');
    if (backButton) {
        backButton.addEventListener('click', () => {
            const role = sessionStorage.getItem('userRole')?.toLowerCase();
            const dashboardUrl = role === 'admin' ? 'dashboard-admin.html' : 'dashboard-user.html';
            window.location.href = dashboardUrl;
        });
    }
}

/**
 * Download PDF dari base64
 */
function downloadPdfFromBase64(base64Data, fileName) {
    try {
        if (!base64Data) throw new Error('base64 kosong');
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: 'application/pdf'});
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName || 'download.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Gagal memproses PDF:", e);
        displayMessage("Gagal mengunduh PDF.", "error");
    }
}

// ===================================================================
// FUNGSI PEMBUAT KARTU (CARD CREATORS)
// ===================================================================

/**
 * Membuat kartu pelanggan
 */
function createCustomerCard(customer) {
    const nama = customer.NAMA_PELANGGAN || customer.NAMA || 'Nama Tidak Diketahui';
    const alamat = customer.ALAMAT_PELANGGAN || customer.ALAMAT || 'N/A';

    const card = document.createElement('div');
    card.className = 'customer-maintenance-item';
    card.innerHTML = `
        <div class="item-header">
            <span class="item-id">ID: ${customer.IDPEL || 'N/A'}</span>
        </div>
        <h3>${nama}</h3>
        <p>Alamat: ${alamat}</p>
        <div class="item-actions">
            <button class="detail-button" data-idpel="${customer.IDPEL}">Detail Pelanggan</button>
        </div>`;

    const btn = card.querySelector('.detail-button');
    if (btn) {
        btn.addEventListener('click', function() {
            window.location.href = `detail_pelanggan.html?idpel=${encodeURIComponent(this.dataset.idpel)}`;
        });
    }
    return card;
}

/**
 * Membuat kartu pekerjaan
 */
function createWorkCard(work) {
    const card = document.createElement('div');
    card.className = 'customer-maintenance-item';
    const status = work.STATUS_PEKERJAAN || 'N/A';
    const statusLC = String(status).trim().toLowerCase();
    const statusClass = 'status-' + statusLC.replace(/ /g, '-');
    const role = sessionStorage.getItem('userRole')?.toLowerCase();

    let actionButton = '';
    if (statusLC === 'belum dikerjakan' || statusLC === 'terjadwal') {
        actionButton = `<button class="action-button-work start-button" data-work-id="${work.ID_PEKERJAAN}">Mulai Pekerjaan</button>`;
    } else if (statusLC === 'berjalan') {
        actionButton = `<button class="action-button-work continue-button" data-work-id="${work.ID_PEKERJAAN}">Lanjutkan Pekerjaan</button>`;
    } else if (statusLC === 'selesai' && role === 'admin') {
        actionButton = `<button class="action-button-work continue-button" data-work-id="${work.ID_PEKERJAAN}">Perbaiki (Admin)</button>`;
    }

    card.innerHTML = `
        <div class="item-header">
            <span class="item-id">ID: ${work.ID_PEKERJAAN || 'N/A'}</span>
            <span class="item-status ${statusClass}">${status}</span>
        </div>
        <h3>${work.NAMA_PEKERJAAN || 'N/A'}</h3>
        <p><strong>Pelanggan:</strong> ${work.NAMA_PELANGGAN || 'N/A'} (${work.ID_PELANGGAN || 'N/A'})</p>
        <p><strong>Alamat:</strong> ${work.ALAMAT_PELANGGAN || 'N/A'}</p>
        <p><strong>Tanggal:</strong> ${work.TANGGAL_PELAKSANAAN || 'Belum ditentukan'}</p>
        <div class="item-actions">
            ${actionButton}
            <button class="detail-button" data-work-id="${work.ID_PEKERJAAN}">Detail</button>
        </div>`;
    return card;
}

/**
 * Membuat kartu berita acara
 */
function createBeritaAcaraCard(item) {
    const card = document.createElement('div');
    card.className = 'customer-maintenance-item';
    card.innerHTML = `
        <div class="item-header">
            <span class="item-id">ID Pelanggan: ${item.IDPEL || 'N/A'}</span>
        </div>
        <h3>${item.NAMA || 'Nama tidak tersedia'}</h3>
        <p>Alamat: ${item.ALAMAT || 'N/A'}</p>
        <p>ID Pekerjaan: ${item.ID_PEKERJAAN || 'N/A'}</p>
        <div class="item-actions">
            <button class="print-button" data-work-id="${item.ID_PEKERJAAN}">Cetak Berita Acara</button>
        </div>
    `;
    return card;
}

// ===================================================================
// FUNGSI-FUNGSI UTAMA PER HALAMAN
// ===================================================================

/**
 * Handle halaman login
 */
async function handleLoginPage() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = form.username?.value?.trim();
        const password = form.password?.value;
        const loginError = document.getElementById('loginError');
        
        if (loginError) loginError.textContent = '';
        
        if (!username || !password) {
            if (loginError) loginError.textContent = 'Username dan password harus diisi.';
            return;
        }
        
        displayMessage('Mencoba login...', 'info');
        const result = await callBackend('login', { username, password });
        
        if (result && result.success) {
            displayMessage('Login berhasil!', 'success');
            try { 
                sessionStorage.setItem('userRole', (result.role || 'user')); 
            } catch(e){}
            
            const targetPage = (result.role || '').toLowerCase() === 'admin' ? 'dashboard-admin.html' : 'dashboard-user.html';
            setTimeout(() => { 
                window.location.href = targetPage; 
            }, 800);
        } else {
            const msg = (result && result.message) ? result.message : 'Login gagal.';
            if (loginError) loginError.textContent = msg;
            displayMessage(msg, 'error');
        }
    });
}

/**
 * Handle halaman register
 */
async function handleRegisterPage() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const accountData = Object.fromEntries(formData.entries());

        // Validasi
        const requiredFields = ['username', 'password', 'name', 'email', 'role'];
        for (const f of requiredFields) {
            if (!accountData[f] || String(accountData[f]).trim() === '') {
                displayMessage('Semua kolom wajib diisi.', 'error');
                return;
            }
        }

        if (accountData.password.length !== 8) {
            displayMessage('Password harus terdiri dari 8 karakter.', 'error');
            return;
        }

        displayMessage('Mendaftarkan akun baru...', 'info');
        const result = await callBackend('register', accountData);
        
        if (result && result.success) {
            displayMessage(result.message || 'Akun berhasil didaftarkan!', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1400);
        } else {
            displayMessage((result && result.message) || 'Gagal mendaftarkan akun.', 'error');
        }
    });
}

/**
 * Load statistik dashboard
 */
async function loadDashboardStats() {
    const elements = {
        pemeliharaanSelesai: document.getElementById('pemeliharaanSelesai'),
        pemeliharaanBerjalan: document.getElementById('pemeliharaanBerjalan'),
        pemeliharaanTerjadwal: document.getElementById('pemeliharaanTerjadwal'),
        pemeliharaanBelumDikerjakan: document.getElementById('pemeliharaanBelumDikerjakan')
    };

    if (Object.values(elements).every(el => el)) {
        const statsResult = await callBackend('getWorkStats');
        if (statsResult && statsResult.success && statsResult.stats) {
            elements.pemeliharaanSelesai.textContent = statsResult.stats.completed ?? '0';
            elements.pemeliharaanBerjalan.textContent = statsResult.stats.inProgress ?? '0';
            elements.pemeliharaanTerjadwal.textContent = statsResult.stats.scheduled ?? '0';
            elements.pemeliharaanBelumDikerjakan.textContent = statsResult.stats.belumDikerjakan ?? '0';
        } else {
            Object.values(elements).forEach(el => el.textContent = 'X');
        }
    }
}

/**
 * Handle dashboard admin
 */
async function handleAdminDashboardPage() {
    const customerCountElement = document.getElementById('jumlahPelanggan');
    if (customerCountElement) {
        const countResult = await callBackend('getCustomerCount');
        customerCountElement.textContent = (countResult && countResult.success) ? countResult.count : 'Error';
    }
    await loadDashboardStats();
}

/**
 * Handle dashboard user
 */
async function handleUserDashboardPage() {
    await loadDashboardStats();
}

/**
 * Handle halaman data pelanggan
 */
async function handleDataPelangganPage() {
    const container = document.getElementById('customerMaintenanceList');
    const searchForm = document.getElementById('searchForm');
    if (!container || !searchForm) return;

    const loadCustomerData = async (params = {}) => {
        container.innerHTML = '<p style="text-align: center; color: #666;">Memuat data pelanggan...</p>';
        const result = await callBackend('getCustomers', params);
        container.innerHTML = '';
        
        if (result && result.success && Array.isArray(result.customers) && result.customers.length > 0) {
            result.customers.forEach(customer => container.appendChild(createCustomerCard(customer)));
        } else {
            container.innerHTML = `<p style="text-align: center; color: #666;">${(result && result.message) || 'Tidak ada data pelanggan ditemukan.'}</p>`;
        }
    };

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const idPelanggan = document.getElementById('searchIdPelanggan')?.value?.trim() || '';
        const namaPerusahaan = document.getElementById('searchNamaPerusahaan')?.value?.trim() || '';
        loadCustomerData({ idPelanggan, namaPerusahaan });
    });

    document.getElementById('tambahBaru')?.addEventListener('click', () => {
        window.location.href = 'tambah_pelanggan.html';
    });

    // Load data awal
    loadCustomerData();
}

/**
 * Handle halaman tambah pelanggan
 */
async function handleAddCustomerPage() {
    const form = document.getElementById('addCustomerForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const customerData = Object.fromEntries(formData.entries());
        
        if (!customerData.IDPEL || !customerData.NAMA || !customerData.ALAMAT) {
            displayMessage('IDPEL, Nama, dan Alamat wajib diisi.', 'error');
            return;
        }
        
        displayMessage('Menyimpan data pelanggan...', 'info');
        const result = await callBackend('addCustomer', customerData);
        
        if (result && result.success) {
            displayMessage(result.message || 'Pelanggan berhasil ditambahkan!', 'success');
            setTimeout(() => { 
                window.location.href = 'data_pelanggan.html'; 
            }, 1200);
        } else {
            displayMessage((result && result.message) || 'Gagal menambahkan pelanggan.', 'error');
        }
    });
}

/**
 * Handle halaman detail pelanggan
 */
async function handleDetailPelangganPage() {
    const idpel = new URLSearchParams(window.location.search).get('idpel');
    const detailErrorEl = document.getElementById('detailError');
    
    if (!idpel) {
        if (detailErrorEl) detailErrorEl.textContent = 'ID Pelanggan tidak ditemukan di URL.';
        return;
    }
    
    const result = await callBackend('getCustomerDetail', { idpel });
    if (result && result.success && result.customer) {
        const customer = result.customer;
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text ?? 'N/A';
        };
        
        setText('detailUnitup', customer.UNITUP);
        setText('detailIdpel', customer.IDPEL);
        setText('detailNama', customer.NAMA_PELANGGAN || customer.NAMA);
        setText('detailAlamat', customer.ALAMAT_PELANGGAN || customer.ALAMAT);
        setText('detailTarif', customer.TARIF);
        setText('detailDaya', customer.DAYA);
        
        // --- PERUBAHAN DI SINI ---
        setText('detailFaktorKaliDil', customer['FAKTOR KALI DIL'] || customer.FAKTOR_KALI_DIL);
        // -------------------------

        setText('detailMerekKwh', customer.MEREKKWH);
        setText('detailThterakwh', customer.THTERAKWH);
        setText('detailNomorKwh', customer.NOMORKWH);
        setText('detailJamNyalaAgt2025', customer['JAM NYALA AGT 2025'] || customer.JAM_NYALA_AGT_2025);
        setText('detailTikor', customer.TIKOR);
        setText('detailTikorBaru', customer.TIKOR_BARU);
    } else {
        if (detailErrorEl) detailErrorEl.textContent = (result && result.message) || 'Gagal memuat detail pelanggan.';
    }
}


async function handleAddWorkPage() {
    const form = document.getElementById('tambahPekerjaanForm');
    if (!form) return;

    let customerDataForDropdown = [];
    let selectedCustomer = null;

    // Load data pelanggan untuk dropdown
    try {
        const result = await callBackend('getCustomersForDropdown', {});
        
        // --- TAMBAHAN DEBUGGING ---
        console.log("DATA PELANGGAN DARI BACKEND:", result.customers);
        // ---------------------------
        
        if (result && result.success && Array.isArray(result.customers)) {
            customerDataForDropdown = result.customers.filter(customer => 
                customer.IDPEL && customer.NAMA
            );
        } else {
            throw new Error(result?.message || 'Gagal memuat data pelanggan');
        }
    } catch (error) {
        console.error('Error loading customer data:', error);
        displayMessage('Gagal memuat daftar pelanggan: ' + error.message, 'error');
    }

    // Setup dropdown search
    const idpelInput = document.getElementById('idPelangganPekerjaan');
    const dropdownResults = document.getElementById('customerDropdownResults');

    if (idpelInput && dropdownResults) {
        idpelInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            dropdownResults.innerHTML = '';
            dropdownResults.style.display = 'none';
            selectedCustomer = null;

            if (searchTerm.length < 1) {
                clearCustomerFields();
                return;
            }

            const filteredCustomers = customerDataForDropdown.filter(customer => {
                const idpel = String(customer.IDPEL || '').toLowerCase();
                const nama = String(customer.NAMA || '').toLowerCase();
                const alamat = String(customer.ALAMAT || '').toLowerCase();
                
                return idpel.includes(searchTerm) || 
                       nama.includes(searchTerm) ||
                       alamat.includes(searchTerm);
            });

            if (filteredCustomers.length > 0) {
                filteredCustomers.forEach(customer => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    item.innerHTML = `
                        <strong>${customer.IDPEL}</strong> - ${customer.NAMA}
                        ${customer.ALAMAT ? `<br><small>${customer.ALAMAT}</small>` : ''}
                    `;
                    item.addEventListener('click', () => {
                        selectCustomer(customer);
                    });
                    dropdownResults.appendChild(item);
                });
                dropdownResults.style.display = 'block';
            } else {
                const noResultItem = document.createElement('div');
                noResultItem.className = 'dropdown-item';
                noResultItem.innerHTML = '<em>Tidak ada pelanggan ditemukan</em>';
                noResultItem.style.color = '#999';
                noResultItem.style.cursor = 'default';
                dropdownResults.appendChild(noResultItem);
                dropdownResults.style.display = 'block';
            }
        });

        document.addEventListener('click', function(e) {
            if (!idpelInput.contains(e.target) && !dropdownResults.contains(e.target)) {
                dropdownResults.style.display = 'none';
            }
        });
    }

    // --- FUNGSI INILAH YANG DIPERBAIKI (DILENGKAPI) ---
    function selectCustomer(customer) {
        selectedCustomer = customer;
        idpelInput.value = customer.IDPEL || '';
        
        // Isi field-field otomatis
        document.getElementById('namaPelangganTampil').value = customer.NAMA || '';
        document.getElementById('alamatPelangganTampil').value = customer.ALAMAT || '';
        document.getElementById('tarifTampil').value = customer.TARIF || '';
        
        // Ini adalah baris yang error, sekarang akan berhasil
        document.getElementById('faktorKaliDilTampil').value = customer.FAKTOR_KALI_DIL || ''; 
        
        // Baris ini akan mengisi Merek KWH dan TIKOR
        document.getElementById('merekKwhTampil').value = customer.MEREKKWH || ''; 
        document.getElementById('tikorTampil').value = customer.TIKOR || '';
        
        dropdownResults.style.display = 'none';
        console.log('Customer selected:', customer);
    }

    // --- FUNGSI INI JUGA DIPERBAIKI (DILENGKAPI) ---
    function clearCustomerFields() {
        selectedCustomer = null;
        document.getElementById('namaPelangganTampil').value = '';
        document.getElementById('alamatPelangganTampil').value = '';
        document.getElementById('tarifTampil').value = '';
        document.getElementById('faktorKaliDilTampil').value = ''; 
        document.getElementById('merekKwhTampil').value = ''; 
        document.getElementById('tikorTampil').value = '';
    }

    // Toggle tanggal pelaksanaan (Ini tidak berubah)
    const statusSelect = document.getElementById('statusPekerjaan');
    const tanggalGroup = document.getElementById('tanggalPelaksanaanGroup');
    
    if (statusSelect && tanggalGroup) {
        statusSelect.addEventListener('change', () => {
            tanggalGroup.style.display = (statusSelect.value === 'Terjadwal')? 'block' : 'none';
            if (statusSelect.value !== 'Terjadwal') {
                document.getElementById('tanggalPelaksanaan').value = '';
            }
        });
        
        tanggalGroup.style.display = (statusSelect.value === 'Terjadwal')? 'block' : 'none';
    }

    // Handle form submit (Ini tidak berubah)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const workData = Object.fromEntries(formData.entries());
        
        if (!workData.idPelanggan || !selectedCustomer) {
            return displayMessage('Pilih pelanggan yang valid dari dropdown.', 'error');
        }
        
        if (!workData.namaPekerjaan || workData.namaPekerjaan.trim() === '') {
            return displayMessage('Nama Pekerjaan wajib diisi.', 'error');
        }
        
        if (!workData.statusPekerjaan) {
            return displayMessage('Status pekerjaan wajib dipilih.', 'error');
        }
        
        if (workData.statusPekerjaan === 'Terjadwal' && !workData.tanggalPelaksanaan) {
            return displayMessage('Tanggal Pelaksanaan wajib diisi untuk status Terjadwal.', 'error');
        }

        displayMessage('Menambahkan pekerjaan...', 'info');

        try {
            const addResult = await callBackend('addWork', workData);
            
            if (addResult && addResult.success) {
                displayMessage(addResult.message || 'Pekerjaan berhasil ditambahkan!', 'success');
                
                form.reset();
                clearCustomerFields();
                dropdownResults.style.display = 'none';
                
                setTimeout(() => {
                    window.location.href = 'pekerjaan.html';
                }, 1500);
            } else {
                const errorMsg = (addResult && addResult.message) || 'Gagal menambahkan pekerjaan.';
                displayMessage(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            displayMessage('Terjadi kesalahan saat mengirim data: ' + error.message, 'error');
        }
    });
}


/**
 * Handle halaman daftar pekerjaan
 */
async function handleWorkListPage() {
    const workListContainer = document.getElementById('customerMaintenanceList');
    if (!workListContainer) return;
    
    const loadWorkData = async (params = {}) => {
        workListContainer.innerHTML = '<p style="text-align: center; color: #666;">Memuat data pekerjaan...</p>';
        const result = await callBackend('getWorks', params);
        
        console.log('📊 Data pekerjaan dari backend:', result);
        
        workListContainer.innerHTML = '';
        
        if (result && result.success && Array.isArray(result.works) && result.works.length > 0) {
            result.works.forEach(work => {
                console.log('📝 Work item:', work);
                
                // DEBUG: Log data pelanggan untuk troubleshooting
                console.log('👤 Data pelanggan:', {
                    id: work.ID_PELANGGAN,
                    nama: work.NAMA_PELANGGAN,
                    alamat: work.ALAMAT_PELANGGAN,
                    fullWorkData: work
                });
                
                workListContainer.appendChild(createWorkCard(work));
            });
        } else {
            workListContainer.innerHTML = `<p style="text-align: center; color: #666;">${(result && result.message) || 'Tidak ada data pekerjaan.'}</p>`;
        }
    };

    // Handle search form
    document.getElementById('searchForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchParams = {
            idPekerjaan: document.getElementById('searchIdPekerjaan')?.value?.trim() || '',
            namaPekerjaan: document.getElementById('searchNamaPekerjaan')?.value?.trim() || '',
            statusPekerjaan: document.getElementById('searchStatusPekerjaan')?.value?.trim() || ''
        };
        console.log('🔍 Search params:', searchParams);
        loadWorkData(searchParams);
    });

    // Handle klik pada tombol aksi
    workListContainer.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target?.dataset.workId) return;
        
        const workId = target.dataset.workId;
        
        if (target.classList.contains('detail-button')) {
            window.location.href = `detail_pekerjaan.html?workId=${workId}`;
        } else if (target.classList.contains('action-button-work')) {
            showCustomConfirm('Apakah Anda yakin ingin memulai/melanjutkan pekerjaan ini?', async () => {
                displayMessage('Memperbarui status pekerjaan...', 'info');
                const result = await callBackend('updateWorkStatus', { 
                    workId: workId, 
                    newStatus: 'Berjalan' 
                });
                
                if (result && result.success) {
                    window.location.href = `kerjakan_pekerjaan.html?workId=${workId}`;
                } else {
                    displayMessage((result && result.message) || 'Gagal memperbarui status pekerjaan.', 'error');
                }
            });
        }
    });

    // Load data awal
    loadWorkData();
}

/**
 * Handle halaman detail pekerjaan
 */
async function handleWorkDetailPage() {
    const workId = new URLSearchParams(window.location.search).get('workId');
    const errorContainer = document.getElementById('detailError');
    
    if (!workId) {
        if (errorContainer) errorContainer.textContent = 'Error: ID Pekerjaan tidak ditemukan di URL.';
        return;
    }
    
    const result = await callBackend('getWorkDetail', { workId });
    if (result && result.success && result.work) {
        const work = result.work;
        const setText = (id, text) => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = text ?? 'N/A';
        };
        
        setText('detail-id-pekerjaan', work.ID_PEKERJAAN);
        setText('detail-nama-pekerjaan', work.NAMA_PEKERJAAN);
        setText('detail-status-pekerjaan', work.STATUS_PEKERJAAN);
        setText('detail-tanggal-pelaksanaan', work.TANGGAL_PELAKSANAAN);
        setText('detail-id-pelanggan', work.ID_PELANGGAN);
        setText('detail-nama-pelanggan', work.NAMA_PELANGGAN);
        setText('detail-alamat-pelanggan', work.ALAMAT_PELANGGAN);
        setText('detail-deskripsi-pekerjaan', work.DESKRIPSI_PEKERJAAN);
        setText('detail-tikor', work.TIKOR);
        setText('detail-tikor-baru', work.TIKOR_BARU);
        setText('detail-tarif', work.TARIF);
        setText('detail-faktor-kali-dil', work.FAKTOR_KALI_DIL);
        setText('detail-merek-kwh', work.MEREKKWH);
        setText('detail-tipe-kwh', work.TIPE_KWH);
        setText('detail-thterakwh', work.THTERAKWH);
        setText('detail-nama-penyulang', work.NAMA_PENYULANG_1);

        // Setup tombol peta untuk TIKOR
        setupMapButton('detail-tikor', 'map-link-tikor');
        setupMapButton('detail-tikor-baru', 'map-link-tikor-baru');
        
    } else {
        if (errorContainer) errorContainer.textContent = (result && result.message) || 'Gagal memuat detail pekerjaan.';
    }
}

/**
 * Setup tombol peta untuk koordinat
 */
function setupMapButton(coordElementId, buttonId) {
    const coordElement = document.getElementById(coordElementId);
    const mapButton = document.getElementById(buttonId);
    
    if (coordElement && mapButton) {
        const coords = coordElement.textContent.trim();
        if (coords && coords !== 'N/A' && coords.includes(',')) {
            mapButton.style.display = 'inline-block';
            mapButton.addEventListener('click', () => {
                const url = `https://www.google.com/maps?q=${encodeURIComponent(coords)}`;
                window.open(url, '_blank');
            });
        }
    }
}

/**
 * Handle halaman kerjakan pekerjaan
 */
async function handleKerjakanPekerjaanPage() {
    const workId = new URLSearchParams(window.location.search).get('workId');
    
    if (!workId) {
        const container = document.querySelector('.container.content');
        if (container) container.innerHTML = '<p style="text-align:center;color:red;">Error: ID Pekerjaan tidak valid.</p>';
        return;
    }
    
    console.log('🔄 Loading work detail for:', workId);
    
    const result = await callBackend('getWorkDetail', { workId });
    console.log('📥 Work detail response:', result);
    
    if (result && result.success && result.work) {
        const work = result.work;
        console.log('✅ Work data loaded:', work);
        
        // Update UI elements
        const workIdDisplay = document.getElementById('workIdDisplay');
        const workNameDisplay = document.getElementById('workNameDisplay');
        const customerNameDisplay = document.getElementById('customerNameDisplay');
        const customerAddressDisplay = document.getElementById('customerAddressDisplay');
        
        if (workIdDisplay) workIdDisplay.textContent = work.ID_PEKERJAAN || 'Tidak ada ID';
        if (workNameDisplay) workNameDisplay.textContent = work.NAMA_PEKERJAAN || 'Tidak ada nama pekerjaan';
        if (customerNameDisplay) {
            const customerName = work.NAMA_PELANGGAN || 'Data pelanggan tidak tersedia';
            const customerId = work.ID_PELANGGAN || 'Tidak ada ID';
            customerNameDisplay.textContent = `${customerName} (${customerId})`;
        }
        if (customerAddressDisplay) {
            customerAddressDisplay.textContent = work.ALAMAT_PELANGGAN || 'Alamat tidak tersedia';
        }
        
        // Setup links
        const goToDataForm = document.getElementById('goToDataForm');
        const goToPhotoForm = document.getElementById('goToPhotoForm');
        
        if (goToDataForm) goToDataForm.href = `isi_data_pekerjaan.html?workId=${encodeURIComponent(workId)}`;
        if (goToPhotoForm) goToPhotoForm.href = `isi_foto_pekerjaan.html?workId=${encodeURIComponent(workId)}`;
        
    } else {
        console.error('❌ Failed to load work detail:', result);
        const card = document.getElementById('work-info-card');
        if (card) {
            card.innerHTML = `<p style="text-align:center; color:red;">Gagal memuat detail pekerjaan</p>`;
        }
    }

    // Handle tombol selesai - REDIRECT KE PEKERJAAN SETELAH SELESAI
    const finishButton = document.getElementById('finishWorkFromAksi');
    if (finishButton) {
        finishButton.addEventListener('click', () => {
            showCustomConfirm(`Apakah Anda yakin ingin menyelesaikan pekerjaan ${workId}?`, async () => {
                displayMessage('Menyelesaikan pekerjaan...', 'info');
                const finishResult = await callBackend('updateWorkStatus', { 
                    workId, 
                    newStatus: 'Selesai' 
                });
                
                if (finishResult && finishResult.success) {
                    displayMessage('Pekerjaan telah berhasil diselesaikan!', 'success');
                    setTimeout(() => { 
                        // REDIRECT KE HALAMAN PEKERJAAN, BUKAN DASHBOARD
                        window.location.href = 'pekerjaan.html'; 
                    }, 1200);
                } else {
                    displayMessage((finishResult && finishResult.message) || 'Gagal menyelesaikan pekerjaan.', 'error');
                }
            });
        });
    }
}

/**
 * Handle halaman isi data pekerjaan - DENGAN PERHITUNGAN OTOMATIS YANG BENAR
 */
/**
 * Handle halaman isi data pekerjaan - VERSI PERBAIKAN
 * Menghitung ulang nilai mentah sebelum dikirim ke Google Sheets
 */
async function handleIsiDataPage() {
    const workId = new URLSearchParams(window.location.search).get('workId');
    const mainForm = document.getElementById('workDataForm');
    
    if (!workId || !mainForm) {
        const container = document.querySelector('.container.content');
        if (container) container.innerHTML = '<p style="text-align:center;color:red;">Error: Elemen form atau Work ID tidak ditemukan.</p>';
        return;
    }
    
    // Setup tombol kembali
    const backToAksiLink = document.getElementById('backToAksiLink');
    if (backToAksiLink) backToAksiLink.href = `kerjakan_pekerjaan.html?workId=${encodeURIComponent(workId)}`;
    
    // Load detail pekerjaan untuk header
    const detailResult = await callBackend('getWorkDetail', { workId });
    if (detailResult && detailResult.success && detailResult.work) {
        const work = detailResult.work;
        
        document.getElementById('workIdDisplay') && (document.getElementById('workIdDisplay').textContent = work.ID_PEKERJAAN);
        document.getElementById('customerNameDisplay') && (document.getElementById('customerNameDisplay').textContent = work.NAMA_PELANGGAN);
        document.getElementById('idpelDisplay') && (document.getElementById('idpelDisplay').textContent = work.ID_PELANGGAN);
        document.getElementById('customerAddressDisplay') && (document.getElementById('customerAddressDisplay').textContent = work.ALAMAT_PELANGGAN);
        document.getElementById('hiddenWorkId') && (document.getElementById('hiddenWorkId').value = workId);
        document.getElementById('hiddenIdpel') && (document.getElementById('hiddenIdpel').value = work.ID_PELANGGAN);

        const fieldE = document.getElementById('field_e');
        if (fieldE && work.FAKTOR_KALI_DIL) {
            fieldE.value = work.FAKTOR_KALI_DIL;
        }

        // Load existing execution data
        const executionDataResult = await callBackend('getWorkExecutionData', { workId: workId });
        if (executionDataResult && executionDataResult.success && executionDataResult.data) {
            for (const key in executionDataResult.data) {
                if (Object.prototype.hasOwnProperty.call(executionDataResult.data, key) && mainForm.elements[key]) {
                    mainForm.elements[key].value = executionDataResult.data[key] || '';
                }
            }

            if (typeof window.calculateAutoValues === 'function') {
                // Panggil fungsi dari HTML untuk memformat UI dengan koma
                setTimeout(window.calculateAutoValues, 500); 
            }
        }
    } else {
        const container = document.querySelector('.container.content');
        if (container) container.innerHTML = `<p style="text-align:center;color:red;">Gagal memuat detail pekerjaan</p>`;
        return;
    }
    
    // Handle form submit (INI BAGIAN YANG DIPERBAIKI)
    mainForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Panggil fungsi UI (dari HTML) sekali lagi untuk memastikan UI update
        if (typeof window.calculateAutoValues === 'function') {
            window.calculateAutoValues();
        }
        
        // Ambil data form (masih mengandung string koma/persen)
        const formData = new FormData(mainForm);
        const dataToSave = Object.fromEntries(formData.entries());

        // --- MULAI PERBAIKAN DATA UNTUK GOOGLE SHEETS ---
        
        // 1. Helper untuk mengambil nilai mentah (ganti koma -> titik)
        const getRawFloat = (id) => {
            const value = document.getElementById(id)?.value || "";
            // Ganti koma (,) jadi titik (.) untuk parsing
            const cleanValue = String(value).replace(",", "."); 
            return parseFloat(cleanValue) || 0;
        };

        // 2. Helper untuk membatasi 8 desimal (sesuai permintaan)
        // parseFloat(num.toFixed(8)) adalah cara aman untuk "batasi 8 desimal"
        const toFixed8 = (num) => isFinite(num) ? parseFloat(num.toFixed(8)) : 0;

        // 3. Ambil semua nilai INPUT mentah (bersihkan dari koma)
        const F = getRawFloat('field_f'); // FAKTOR KALI REAL LIHAT
        const G = getRawFloat('field_g'); // ARUS PRIMER R UKUR
        const H = getRawFloat('field_h'); // ARUS PRIMER S UKUR
        const I = getRawFloat('field_i'); // ARUS PRIMER T UKUR
        const J = getRawFloat('field_j');
        const K = getRawFloat('field_k');
        const L = getRawFloat('field_l');
        const M = getRawFloat('field_m');
        
        // Ini adalah INPUT P PRIMER R/S/T UKUR yang Anda tanyakan
        // Kita ambil nilainya yang bersih (sudah jadi angka)
        const N = getRawFloat('field_n'); // P PRIMER R UKUR
        const O = getRawFloat('field_o'); // P PRIMER S UKUR
        const P = getRawFloat('field_p'); // P PRIMER T UKUR
        
        const R = getRawFloat('field_r');
        const S = getRawFloat('field_s');
        const T_val = getRawFloat('field_t');
        const U = getRawFloat('field_u');
        const V = getRawFloat('field_v');
        const W = getRawFloat('field_w');
        const X = getRawFloat('field_x');
        const Y = getRawFloat('field_y');
        const Z = getRawFloat('field_z');
        const AA = getRawFloat('field_aa');
        const E = getRawFloat('field_e'); // FAKTOR KALI DIL

        // 4. TIMPA (OVERWRITE) dataToSave dengan nilai input yang sudah bersih
        // Ini memastikan P PRIMER R/S/T UKUR dikirim sebagai angka
        dataToSave['FAKTOR KALI REAL LIHAT'] = F;
        dataToSave['ARUS PRIMER FASA R (A) UKUR'] = G;
        dataToSave['ARUS PRIMER FASA S (A) UKUR'] = H;
        dataToSave['ARUS PRIMER FASA T (A) UKUR'] = I;
        dataToSave['TEGANGAN PRIMER FASA R (V) UKUR'] = J;
        dataToSave['TEGANGAN PRIMER FASA S (V) UKUR'] = K;
        dataToSave['TEGANGAN PRIMER FASA T (V) UKUR'] = L;
        dataToSave['COS PHI PRIMER UKUR'] = M;
        dataToSave['P PRIMER R UKUR'] = N;
        dataToSave['P PRIMER S UKUR'] = O;
        dataToSave['P PRIMER T UKUR'] = P;
        dataToSave['ARUS SEKUNDER FASA R (A) UKUR'] = R;
        dataToSave['ARUS SEKUNDER FASA S (A) UKUR'] = S;
        dataToSave['ARUS SEKUNDER FASA T (A) UKUR'] = T_val;
        dataToSave['ARUS SEKUNDER FASA R (A) METER'] = U;
        dataToSave['ARUS SEKUNDER FASA S (A) METER'] = V;
        dataToSave['ARUS SEKUNDER FASA T (A) METER'] = W;
        dataToSave['TEGANGAN KWH METER FASA R (V) METER'] = X;
        dataToSave['TEGANGAN KWH METER FASA S (V)'] = Y;
        dataToSave['TEGANGAN KWH METER FASA T (V)'] = Z;
        dataToSave['COS PHI SEKUNDER'] = AA;
        dataToSave['FAKTOR KALI DIL'] = E;

        // 5. HITUNG ULANG NILAI OTOMATIS (sebagai angka mentah, maks 8 desimal)
        // Logika ini disalin dari HTML Anda, tapi diubah agar menghasilkan ANGKA
        
        const raw_AB = toFixed8((U * X * AA) / 1000);
        const raw_AC = toFixed8((V * Y * AA) / 1000);
        const raw_AD = toFixed8((W * Z * AA) / 1000);
        
        const raw_Q = toFixed8(N + O + P); 
        const raw_AE = toFixed8(raw_AB + raw_AC + raw_AD); 

        const raw_AF = toFixed8(N !== 0 ? ((raw_AB * F) - N) / N : 0);
        const raw_AG = toFixed8(O !== 0 ? ((raw_AC * F) - O) / O : 0);
        const raw_AH = toFixed8(P !== 0 ? ((raw_AD * F) - P) / P : 0);
        const raw_AI = toFixed8(raw_Q !== 0 ? ((raw_AE * F) - raw_Q) / raw_Q : 0);
        
        const raw_AJ = toFixed8(G !== 0 ? ((R * F) - G) / G : 0);
        const raw_AK = toFixed8(H !== 0 ? ((S * F) - H) / H : 0);
        const raw_AL = toFixed8(I !== 0 ? ((T_val * F) - I) / I : 0);
        
        const arusSekunderMeterTotal = U + V + W;
        const arusPrimerTotal = G + H + I;
        const raw_AM = toFixed8(arusPrimerTotal !== 0 ? ((arusSekunderMeterTotal * F) - arusPrimerTotal) / arusPrimerTotal : 0);

        let raw_AN = "NORMAL";
        if (F !== 0 && E !== 0 && F !== E) raw_AN = "CEK CT";

        let raw_AO = "NORMAL";
        if (raw_AM > 0.02 && raw_AI > 0.02) raw_AO = "GANTI METER DAN CT";
        else if (raw_AI > 0.02 && raw_AM <= 0.02) raw_AO = "GANTI METER";
        else if (raw_AI <= 0.02 && raw_AM > 0.02) raw_AO = "GANTI CT";

        // 6. TIMPA (OVERWRITE) dataToSave dengan nilai kalkulasi yang mentah
        dataToSave['P PRIMER TOTAL'] = raw_Q;
        dataToSave['P METER R (kw)'] = raw_AB;
        dataToSave['P METER S (kw)'] = raw_AC;
        dataToSave['P METER T (kw)'] = raw_AD;
        dataToSave['P METER T UKUR TOTAL'] = raw_AE;
        
        dataToSave['ERROR KWH METER R'] = raw_AF;
        dataToSave['ERROR KWH METER S'] = raw_AG;
        dataToSave['ERROR KWH METER T'] = raw_AH;
        dataToSave['ERROR KWH METER TOTAL'] = raw_AI;
        
        dataToSave['ERROR CT FASA R'] = raw_AJ;
        dataToSave['ERROR CT FASA S'] = raw_AK;
        dataToSave['ERROR CT FASA T'] = raw_AL;
        dataToSave['ERROR CT TOTAL'] = raw_AM;
        
        dataToSave['CATATAN CT'] = raw_AN;
        dataToSave['REKOMENDASI'] = raw_AO;

        // --- SELESAI PERBAIKAN DATA ---

        console.log("Data yang dikirim ke Google Sheets:", dataToSave);

        // 7. Kirim data yang sudah bersih ke backend
        displayMessage('Menyimpan data...', 'info');
        const result = await callBackend('saveWorkExecutionData', dataToSave);
        
        if (result && result.success) {
            displayMessage(result.message || 'Data berhasil disimpan!', 'success');
            setTimeout(() => { 
                window.location.href = `kerjakan_pekerjaan.html?workId=${encodeURIComponent(workId)}`; 
            }, 1200);
        } else {
            displayMessage((result && result.message) || 'Gagal menyimpan data.', 'error');
        }
    });
}
/**
 * Handle halaman berita acara
 */
async function handleBeritaAcaraPage() {
    const grid = document.getElementById('beritaAcaraList');
    const searchForm = document.getElementById('searchForm');
    const backButton = document.getElementById('backToAdminDashboardFromBA');

    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'dashboard-admin.html';
        });
    }
    
    if (!grid || !searchForm) return;

    const loadCompletedWorks = async (params = {}) => {
        grid.innerHTML = '<p style="text-align: center; color: #666;">Memuat data pekerjaan yang telah selesai...</p>';
        const result = await callBackend('getCompletedWorks', params);
        grid.innerHTML = '';
        
        if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
            result.data.forEach(item => grid.appendChild(createBeritaAcaraCard(item)));
        } else {
            grid.innerHTML = `<p style="text-align: center; color: #666;">${(result && result.message) || 'Tidak ada data pekerjaan yang selesai.'}</p>`;
        }
    };

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchParams = {
            id: document.getElementById('searchId')?.value?.trim() || '',
            nama: document.getElementById('searchNama')?.value?.trim() || ''
        };
        loadCompletedWorks(searchParams);
    });

    grid.addEventListener('click', async (event) => {
        if (event.target.classList.contains('print-button')) {
            const printButton = event.target;
            const workId = printButton.dataset.workId;
            
            if (!workId) {
                displayMessage('ID Pekerjaan tidak ditemukan pada tombol.', 'error');
                return;
            }
            
            const originalText = printButton.textContent;
            printButton.disabled = true;
            printButton.textContent = 'Mencetak...';
            
            const result = await callBackend('print', { workId: workId });
            
            if (result && result.success && result.pdfData) {
                downloadPdfFromBase64(result.pdfData.base64Data, result.pdfData.fileName);
            } else {
                displayMessage((result && result.message) || 'Gagal membuat PDF.', 'error');
            }
            
            printButton.disabled = false;
            printButton.textContent = originalText;
        }
    });

    // Load data awal
    loadCompletedWorks();
}

// ===================================================================
// ROUTER FRONTEND (DOMContentLoaded)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupBackButton();
    const path = window.location.pathname.split('/').pop() || 'login.html';

    switch(path) {
        case 'login.html':
            handleLoginPage(); 
            break;
        case 'daftar_akun.html':
            handleRegisterPage(); 
            break;
        case 'dashboard-admin.html':
            handleAdminDashboardPage(); 
            break;
        case 'dashboard-user.html':
            handleUserDashboardPage(); 
            break;
        case 'data_pelanggan.html':
            handleDataPelangganPage(); 
            break;
        case 'tambah_pelanggan.html':
            handleAddCustomerPage(); 
            break;
        case 'detail_pelanggan.html':
            handleDetailPelangganPage(); 
            break;
        case 'tambah-pekerjaan.html':
            handleAddWorkPage(); 
            break;
        case 'pekerjaan.html':
            handleWorkListPage(); 
            break;
        case 'detail_pekerjaan.html':
            handleWorkDetailPage(); 
            break;
        case 'kerjakan_pekerjaan.html':
            handleKerjakanPekerjaanPage(); 
            break;
        case 'isi_data_pekerjaan.html':
            handleIsiDataPage(); 
            break;
        case 'isi_foto_pekerjaan.html':
            handleIsiFotoPage(); 
            break;
        case 'berita-acara.html':
            handleBeritaAcaraPage(); 
            break;
        default:
            // Halaman lain tidak memerlukan inisialisasi khusus
            break;
    }
});