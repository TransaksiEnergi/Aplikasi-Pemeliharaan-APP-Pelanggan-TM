// ===================================================================
// KONFIGURASI GLOBAL
// ===================================================================
const BASE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxHqNnBQ656O2tfhBWTTGhtL_jxIE1y9yiw9-JG7PDscu3JaEJAo05s2HHPfIYyMTQE/exec';
let customerDataForDropdown = [];

// ===================================================================
// FUNGSI PEMBANTU
// ===================================================================

async function callBackend(action, params = {}) {
    // Cek jika params adalah FormData, maka gunakan fetch biasa
    if (params instanceof FormData) {
        params.append('action', action);
        try {
            const response = await fetch(BASE_APP_SCRIPT_URL, {
                method: 'POST',
                body: params,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Kesalahan server: ${response.status}. Detail: ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error memanggil backend (FormData) action ${action}:`, error);
            displayMessage('Kesalahan koneksi saat mengunggah.', 'error');
            return { success: false, message: 'Terjadi kesalahan saat menghubungi server.' };
        }
    }

    // Logika untuk data URL-encoded
    const urlParams = new URLSearchParams({ action, ...params });
    try {
        const response = await fetch(BASE_APP_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlParams.toString(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
            displayMessage(`Kesalahan server: ${response.status}.`, 'error');
            return { success: false, message: `Kesalahan HTTP: ${response.status}` };
        }
        return await response.json();
    } catch (error) {
        console.error(`Error memanggil backend action ${action}:`, error);
        displayMessage('Kesalahan koneksi.', 'error');
        return { success: false, message: 'Terjadi kesalahan saat menghubungi server.' };
    }
}

function displayMessage(message, type = 'info', duration = 4000) {
    const existingModal = document.querySelector('.custom-modal');
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.classList.add('custom-modal');
    modal.innerHTML = `<div class="modal-content ${type}"><span class="close-button">&times;</span><p>${message}</p></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.close-button').onclick = () => modal.remove();
    setTimeout(() => { if (document.body.contains(modal)) modal.remove(); }, duration);
}

function showCustomConfirm(message, onConfirm) {
    const modal = document.createElement('div');
    modal.classList.add('custom-modal');
    modal.innerHTML = `<div class="modal-content confirm"><p>${message}</p><div class="modal-buttons"><button id="confirmYes" class="button">Ya</button><button id="confirmNo" class="button cancel">Tidak</button></div></div>`;
    document.body.appendChild(modal);
    document.getElementById('confirmYes').onclick = () => { onConfirm(); modal.remove(); };
    document.getElementById('confirmNo').onclick = () => modal.remove();
}

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

// ===================================================================
// FUNGSI-FUNGSI UTAMA PER HALAMAN
// ===================================================================

async function handleLoginPage() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = form.username.value;
        const password = form.password.value;
        const loginError = document.getElementById('loginError');
        loginError.textContent = '';
        if (!username || !password) {
            loginError.textContent = 'Username dan password harus diisi.';
            return;
        }
        displayMessage('Mencoba login...', 'info');
        const result = await callBackend('login', { username, password });
        if (result.success) {
            displayMessage('Login berhasil!', 'success');
            sessionStorage.setItem('userRole', result.role || 'user'); 
            const targetPage = result.role?.toLowerCase() === 'admin' ? 'dashboard-admin.html' : 'dashboard-user.html';
            setTimeout(() => { window.location.href = targetPage; }, 1000);
        } else {
            loginError.textContent = result.message || 'Login gagal.';
            displayMessage(result.message || 'Login gagal.', 'error');
        }
    });
}

async function loadDashboardStats() {
    const pemeliharaanSelesai = document.getElementById('pemeliharaanSelesai');
    const pemeliharaanBerjalan = document.getElementById('pemeliharaanBerjalan');
    const pemeliharaanTerjadwal = document.getElementById('pemeliharaanTerjadwal');
    const pemeliharaanBelumDikerjakan = document.getElementById('pemeliharaanBelumDikerjakan');

    if (pemeliharaanSelesai && pemeliharaanBerjalan && pemeliharaanTerjadwal && pemeliharaanBelumDikerjakan) {
        const statsResult = await callBackend('getWorkStats');
        if (statsResult.success) {
            pemeliharaanSelesai.textContent = statsResult.stats.completed;
            pemeliharaanBerjalan.textContent = statsResult.stats.inProgress;
            pemeliharaanTerjadwal.textContent = statsResult.stats.scheduled;
            pemeliharaanBelumDikerjakan.textContent = statsResult.stats.belumDikerjakan;
        } else {
            [pemeliharaanSelesai, pemeliharaanBerjalan, pemeliharaanTerjadwal, pemeliharaanBelumDikerjakan].forEach(el => el.textContent = 'X');
        }
    }
}

async function handleAdminDashboardPage() {
    const customerCountElement = document.getElementById('jumlahPelanggan');
    if (customerCountElement) {
        const countResult = await callBackend('getCustomerCount');
        customerCountElement.textContent = countResult.success ? countResult.count : 'Error';
    }
    await loadDashboardStats();
}

async function handleUserDashboardPage() {
    await loadDashboardStats();
}

async function handleDataPelangganPage() {
    const container = document.getElementById('customerMaintenanceList');
    const searchForm = document.getElementById('searchForm');
    if (!container || !searchForm) return;

    const loadCustomerData = async (params = {}) => {
        container.innerHTML = '<p style="text-align: center; color: #666;">Memuat data pelanggan...</p>';
        const result = await callBackend('getCustomers', params);
        container.innerHTML = '';
        if (result.success && result.customers && result.customers.length > 0) {
            result.customers.forEach(customer => container.appendChild(createCustomerCard(customer)));
        } else {
            container.innerHTML = `<p style="text-align: center; color: #666;">${result.message || 'Tidak ada data pelanggan ditemukan.'}</p>`;
        }
    };

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchParams = {
            idPelanggan: e.target.elements.idPelanggan.value.trim(),
            namaPerusahaan: e.target.elements.namaPerusahaan.value.trim()
        };
        loadCustomerData(searchParams);
    });

    document.getElementById('tambahBaru')?.addEventListener('click', () => {
        window.location.href = 'tambah_pelanggan.html';
    });

    loadCustomerData();
}

function createCustomerCard(customer) {
    const card = document.createElement('div');
    card.className = 'customer-maintenance-item';
    card.innerHTML = `
        <div class="item-header"><span class="item-id">ID: ${customer.IDPEL || 'N/A'}</span></div>
        <h3>${customer.NAMA || 'Nama Tidak Diketahui'}</h3>
        <p>Alamat: ${customer.ALAMAT || 'N/A'}</p>
        <p>Telp: ${customer.NO_TLP || 'N/A'}</p>
        <div class="item-actions">
            <button class="detail-button" data-idpel="${customer.IDPEL}">Detail Pelanggan</button>
        </div>`;
    card.querySelector('.detail-button').addEventListener('click', function() {
        window.location.href = `detail_pelanggan.html?idpel=${encodeURIComponent(this.dataset.idpel)}`;
    });
    return card;
}

async function handleDetailPelangganPage() {
    const idpel = new URLSearchParams(window.location.search).get('idpel');
    const displayContainer = document.getElementById('customerDetailDisplay');
    const errorContainer = document.getElementById('detailError');

    if (!idpel) {
        if(errorContainer) errorContainer.textContent = 'Error: ID Pelanggan tidak valid.';
        return;
    }
    
    if (!displayContainer || !errorContainer) return;
    
    displayContainer.innerHTML = '<p>Memuat detail pelanggan...</p>';
    const result = await callBackend('getCustomerDetail', { idpel });

    if (result.success && result.customer) {
        let content = '';
        for (const key in result.customer) {
            if (result.customer.hasOwnProperty(key)) {
                const formattedKey = key.replace(/_/g, ' ').toUpperCase();
                content += `<p><strong>${formattedKey}:</strong> <span>${result.customer[key] || 'N/A'}</span></p>`;
            }
        }
        displayContainer.innerHTML = content;
    } else {
        displayContainer.innerHTML = '';
        errorContainer.textContent = result.message || 'Gagal memuat detail pelanggan.';
    }
}

async function handleAddWorkPage() {
    const form = document.getElementById('tambahPekerjaanForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const errorDiv = document.getElementById('tambahPekerjaanError');
        errorDiv.textContent = '';
        const pekerjaanData = {
            idPelanggan: form.idPelangganPekerjaan.value,
            namaPekerjaan: form.namaPekerjaan.value,
            deskripsiPekerjaan: form.deskripsiPekerjaan.value,
            statusPekerjaan: form.statusPekerjaan.value,
            tanggalPelaksanaan: form.tanggalPelaksanaan.value || ''
        };
        if (!pekerjaanData.idPelanggan || !pekerjaanData.namaPekerjaan || !pekerjaanData.statusPekerjaan) {
            return errorDiv.textContent = 'ID Pelanggan, Nama Pekerjaan, dan Status wajib diisi.';
        }
        if (pekerjaanData.statusPekerjaan === 'Terjadwal' && !pekerjaanData.tanggalPelaksanaan) {
            return errorDiv.textContent = 'Tanggal Pelaksanaan wajib diisi jika status Terjadwal.';
        }
        displayMessage('Menambahkan pekerjaan...', 'info');
        const result = await callBackend('addWork', pekerjaanData);
        if (result.success) {
            displayMessage(result.message || 'Pekerjaan berhasil ditambahkan!', 'success');
            setTimeout(() => window.location.href = 'pekerjaan.html', 1500);
        } else {
            errorDiv.textContent = result.message || 'Gagal menambahkan pekerjaan.';
            displayMessage('Gagal menambahkan pekerjaan.', 'error');
        }
    });

    await loadCustomerIdsForDropdown();
    const idPelangganInput = document.getElementById('idPelangganPekerjaan');
    const namaTampilInput = document.getElementById('namaPelangganTampil');
    const alamatTampilInput = document.getElementById('alamatPelangganTampil');
    idPelangganInput.addEventListener('input', function() {
        const selectedCustomer = customerDataForDropdown.find(c => c.IDPEL === this.value);
        namaTampilInput.value = selectedCustomer ? selectedCustomer.NAMA : '';
        alamatTampilInput.value = selectedCustomer ? selectedCustomer.ALAMAT : '';
    });

    const statusSelect = document.getElementById('statusPekerjaan');
    const tanggalGroup = document.getElementById('tanggalPelaksanaanGroup');
    statusSelect.addEventListener('change', () => {
        tanggalGroup.style.display = (statusSelect.value === 'Terjadwal') ? 'block' : 'none';
    });
    tanggalGroup.style.display = (statusSelect.value === 'Terjadwal') ? 'block' : 'none';
}

async function loadCustomerIdsForDropdown() {
    const dataList = document.getElementById('customerDatalist');
    if (!dataList) return;
    const result = await callBackend('getCustomersForDropdown', {});
    if (result.success && result.customers) {
        customerDataForDropdown = result.customers;
        dataList.innerHTML = '';
        result.customers.forEach(c => {
            const option = document.createElement('option');
            option.value = c.IDPEL;
            option.textContent = c.NAMA;
            dataList.appendChild(option);
        });
    }
}

async function handleWorkListPage() {
    const workListContainer = document.getElementById('customerMaintenanceList');
    if (!workListContainer) return;

    const loadWorkData = async (params = {}) => {
        workListContainer.innerHTML = '<p style="text-align: center; color: #666;">Memuat data pekerjaan...</p>';
        const result = await callBackend('getWorks', params);
        workListContainer.innerHTML = ''; 
        if (result.success && result.works && result.works.length > 0) {
            result.works.forEach(work => workListContainer.appendChild(createWorkCard(work)));
        } else {
            workListContainer.innerHTML = `<p style="text-align: center; color: #666;">${result.message || 'Tidak ada data pekerjaan.'}</p>`;
        }
    };
    
    document.getElementById('searchForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchParams = {
            idPekerjaan: e.target.elements.idPekerjaan?.value.trim(),
            namaPekerjaan: e.target.elements.namaPekerjaan?.value.trim(),
            statusPekerjaan: e.target.elements.statusPekerjaan?.value.trim()
        };
        loadWorkData(searchParams);
    });

    workListContainer.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target?.dataset.workId) return;
        
        const workId = target.dataset.workId;

        if (target.classList.contains('detail-button')) {
            window.location.href = `detail_pekerjaan.html?workId=${workId}`;
        } else if (target.classList.contains('action-button-work')) {
            showCustomConfirm('Apakah Anda yakin ingin memulai/melanjutkan pekerjaan ini?', async () => {
                displayMessage('Memperbarui status pekerjaan...', 'info');
                
                const result = await callBackend('updateWorkStatus', { workId: workId, newStatus: 'Berjalan' });

                if (result.success) {
                    window.location.href = `kerjakan_pekerjaan.html?workId=${workId}`;
                } else {
                    displayMessage(result.message || 'Gagal memperbarui status pekerjaan.', 'error');
                }
            });
        }
    });

    loadWorkData(); 
}

function createWorkCard(work) {
    const card = document.createElement('div');
    card.className = 'customer-maintenance-item';
    const status = work.STATUS_PEKERJAAN || 'N/A';
    const statusLC = status.trim().toLowerCase();
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
        <div class="item-header"><span class="item-id">ID: ${work.ID_PEKERJAAN || 'N/A'}</span><span class="item-status ${statusClass}">${status}</span></div>
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


async function handleWorkDetailPage() {
    const workId = new URLSearchParams(window.location.search).get('workId');
    const errorContainer = document.getElementById('detailError');

    const idElem = document.getElementById('detail-id-pekerjaan');
    if (!idElem) {
        console.error("Elemen 'detail-id-pekerjaan' tidak ditemukan.");
        return;
    }
    
    if (!workId) {
        if(errorContainer) errorContainer.textContent = 'Error: ID Pekerjaan tidak ditemukan di URL.';
        return;
    }

    const displayContainer = document.getElementById('workDetailDisplay');
    if(displayContainer) {
        displayContainer.querySelectorAll('span').forEach(span => span.textContent = 'Memuat...');
    }

    const result = await callBackend('getWorkDetail', { workId });

    if (result.success && result.work) {
        const work = result.work;
        const setText = (id, text) => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = text || 'N/A';
        };

        setText('detail-id-pekerjaan', work.ID_PEKERJAAN);
        setText('detail-nama-pekerjaan', work.NAMA_PEKERJAAN);
        setText('detail-status-pekerjaan', work.STATUS_PEKERJAAN);
        setText('detail-tanggal-pelaksanaan', work.TANGGAL_PELAKSANAAN);
        setText('detail-id-pelanggan', work.ID_PELANGGAN);
        setText('detail-nama-pelanggan', work.NAMA_PELANGGAN);
        setText('detail-alamat-pelanggan', work.ALAMAT_PELANGGAN);
        setText('detail-deskripsi-pekerjaan', work.DESKRIPSI_PEKERJAAN || 'Tidak ada deskripsi.');

    } else {
        if (errorContainer) {
            errorContainer.textContent = result.message || 'Gagal memuat detail pekerjaan.';
            if (displayContainer) displayContainer.innerHTML = '';
        }
    }
}

async function handleBeritaAcaraPage() {
    const grid = document.getElementById('beritaAcaraList');
    const searchForm = document.getElementById('searchForm');
    
    // --- KODE BARU DIMULAI DI SINI ---
    const backButton = document.getElementById('backToAdminDashboardFromBA');

    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault(); // Mencegah link default
            // Langsung arahkan ke dasbor admin, tanpa memeriksa peran
            window.location.href = 'dashboard-admin.html';
        });
    }
    // --- KODE BARU BERAKHIR DI SINI ---

    if (!grid || !searchForm) return;

    function downloadPdfFromBase64(base64Data, fileName) {
        try {
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: 'application/pdf'});
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Gagal memproses PDF:", e);
            displayMessage("Gagal mengunduh PDF.", "error");
        }
    }
    
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
    
    const loadCompletedWorks = async (params = {}) => {
        grid.innerHTML = '<p style="text-align: center; color: #666;">Memuat data pekerjaan yang telah selesai...</p>';
        const result = await callBackend('getCompletedWorks', params);
        grid.innerHTML = '';
        if (result.success && result.data && result.data.length > 0) {
            result.data.forEach(item => grid.appendChild(createBeritaAcaraCard(item)));
        } else {
            grid.innerHTML = `<p style="text-align: center; color: #666;">${result.message || 'Tidak ada data pekerjaan yang selesai.'}</p>`;
        }
    };

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchParams = {
            id: e.target.elements.searchId.value.trim(),
            nama: e.target.elements.searchNama.value.trim()
        };
        loadCompletedWorks(searchParams);
    });

    grid.addEventListener('click', async (event) => {
        if (event.target.classList.contains('print-button')) {
            const printButton = event.target;
            const workId = printButton.dataset.workId;
            if (!workId) return displayMessage('ID Pekerjaan tidak ditemukan pada tombol.', 'error');

            const originalText = printButton.textContent;
            printButton.disabled = true;
            printButton.textContent = 'Mencetak...';

            const result = await callBackend('print', { workId: workId });
            if (result.success && result.pdfData) {
                downloadPdfFromBase64(result.pdfData.base64Data, result.pdfData.fileName);
            } else {
                displayMessage(result.message || 'Gagal membuat PDF.', 'error');
                console.error('Print Error:', result);
            }

            printButton.disabled = false;
            printButton.textContent = originalText;
        }
    });

    loadCompletedWorks();
}

async function handleKerjakanPekerjaanPage() {
    const workId = new URLSearchParams(window.location.search).get('workId');
    if (!workId) {
        document.querySelector('.container.content').innerHTML = '<p style="text-align:center;color:red;">Error: ID Pekerjaan tidak valid.</p>';
        return;
    }

    const result = await callBackend('getWorkDetail', { workId });

    if (result.success && result.work) {
        const work = result.work;
        document.getElementById('workIdDisplay').textContent = work.ID_PEKERJAAN;
        document.getElementById('workNameDisplay').textContent = work.NAMA_PEKERJAAN;
        document.getElementById('customerNameDisplay').textContent = `${work.NAMA_PELANGGAN} (${work.ID_PELANGGAN})`;
        document.getElementById('customerAddressDisplay').textContent = work.ALAMAT_PELANGGAN;
        document.getElementById('goToDataForm').href = `isi_data_pekerjaan.html?workId=${workId}`;
        document.getElementById('goToPhotoForm').href = `isi_foto_pekerjaan.html?workId=${workId}`;
    } else {
        document.getElementById('work-info-card').innerHTML = `<p style="text-align:center; color:red;">Gagal memuat detail: ${result.message}</p>`;
    }

    document.getElementById('finishWorkFromAksi')?.addEventListener('click', () => {
        showCustomConfirm(`Apakah Anda yakin ingin menyelesaikan pekerjaan ${workId}?`, async () => {
            const finishResult = await callBackend('updateWorkStatus', { workId, newStatus: 'Selesai' });
            if (finishResult.success) {
                displayMessage('Pekerjaan telah berhasil diselesaikan!', 'success');
                setTimeout(() => { window.location.href = 'pekerjaan.html'; }, 1500);
            } else {
                displayMessage(`Gagal: ${finishResult.message}`, 'error');
            }
        });
    });
}

async function handleIsiDataPage() {
    const workId = new URLSearchParams(window.location.search).get('workId');
    const mainForm = document.getElementById('workDataForm');
    if (!workId || !mainForm) {
        document.querySelector('.container.content').innerHTML = '<p style="text-align:center;color:red;">Error: Elemen form atau Work ID tidak ditemukan.</p>';
        return;
    }

    document.getElementById('backToAksiLink').href = `kerjakan_pekerjaan.html?workId=${workId}`;

    const detailResult = await callBackend('getWorkDetail', { workId });
    if (detailResult.success && detailResult.work) {
        const work = detailResult.work;
        document.getElementById('workIdDisplay').textContent = work.ID_PEKERJAAN;
        document.getElementById('customerNameDisplay').textContent = work.NAMA_PELANGGAN;
        document.getElementById('idpelDisplay').textContent = work.ID_PELANGGAN;
        document.getElementById('customerAddressDisplay').textContent = work.ALAMAT_PELANGGAN;
        document.getElementById('hiddenWorkId').value = workId;
        document.getElementById('hiddenIdpel').value = work.ID_PELANGGAN;
        
        const executionDataResult = await callBackend('getWorkExecutionData', { workId: workId });
        if (executionDataResult.success && executionDataResult.data) {
            for (const key in executionDataResult.data) {
                if (mainForm.elements[key]) {
                    mainForm.elements[key].value = executionDataResult.data[key] || '';
                }
            }
        }
    } else {
        document.querySelector('.container.content').innerHTML = `<p style="text-align:center;color:red;">Gagal memuat detail pekerjaan: ${detailResult.message}</p>`;
        return;
    }
    
    mainForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(mainForm);
        // Untuk form ini, kita ubah ke object biasa karena tidak ada file upload
        const dataToSave = Object.fromEntries(formData.entries());
        
        displayMessage('Menyimpan data...', 'info');
        // Action di backend mungkin perlu disesuaikan untuk menerima object, bukan form data
        const result = await callBackend('saveWorkExecutionData', dataToSave);

        if(result.success) {
            displayMessage(result.message || 'Data berhasil disimpan!', 'success');
            setTimeout(() => { window.location.href = `kerjakan_pekerjaan.html?workId=${workId}`; }, 1500);
        } else {
            displayMessage(result.message || 'Gagal menyimpan data.', 'error');
        }
    });
}

/**
 * FUNGSI INI TELAH DIPERBAIKI TOTAL UNTUK MENYESUAIKAN DENGAN HTML DROPDOWN CHECKLIST
 */
async function handleIsiFotoPage() {
    const workId = new URLSearchParams(window.location.search).get('workId');
    const checklistForm = document.getElementById('workChecklistForm');

    if (!workId || !checklistForm) {
        document.querySelector('.container.content').innerHTML = '<p style="text-align:center;color:red;">Error: Elemen form atau Work ID tidak ditemukan.</p>';
        return;
    }

    document.getElementById('backToAksiLink').href = `kerjakan_pekerjaan.html?workId=${workId}`;

    // 1. Mengisi info pekerjaan di bagian atas halaman
    const detailResult = await callBackend('getWorkDetail', { workId });
    if (detailResult.success && detailResult.work) {
        const work = detailResult.work;
        document.getElementById('workIdDisplay').textContent = work.ID_PEKERJAAN;
        document.getElementById('customerNameDisplay').textContent = work.NAMA_PELANGGAN;
        document.getElementById('idpelDisplay').textContent = work.ID_PELANGGAN;
        document.getElementById('customerAddressDisplay').textContent = work.ALAMAT_PELANGGAN;
        
        document.getElementById('formWorkId').value = work.ID_PEKERJAAN;
        document.getElementById('formIdpel').value = work.ID_PELANGGAN;
        document.getElementById('formNama').value = work.NAMA_PELANGGAN;

        // 2. PERBAIKAN: Memuat data checklist yang sudah ada untuk dropdown
        const photoDataResult = await callBackend('getPhotoData', { workId });
        if (photoDataResult.success && photoDataResult.data) {
            for (const key in photoDataResult.data) {
                const value = photoDataResult.data[key];
                if (value) {
                    // Cari elemen <select> berdasarkan atribut 'name' yang sama dengan 'key'
                    const selectElement = checklistForm.elements[key];
                    if (selectElement) {
                        selectElement.value = value;
                    }
                }
            }
        }

    } else {
        document.querySelector('.container.content').innerHTML = `<p style="text-align:center;color:red;">Gagal memuat detail pekerjaan: ${detailResult.message}</p>`;
        return;
    }

    // 3. PERBAIKAN: Event listener untuk submit form checklist
    checklistForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = document.getElementById('submitChecklistButton');
        const formData = new FormData(checklistForm);
        
        submitButton.disabled = true;
        submitButton.textContent = 'Menyimpan...';

        // Menggunakan action 'uploadPhotos' yang sama, namun backend akan menangani data checklist
        const result = await callBackend('uploadPhotos', formData);

        if (result.success) {
            displayMessage(result.message || 'Checklist berhasil disimpan!', 'success');
        } else {
            displayMessage(result.message || 'Gagal menyimpan checklist.', 'error');
        }
        
        submitButton.disabled = false;
        // PERBAIKAN: Sesuaikan teks kembali ke "Simpan Data"
        submitButton.textContent = 'Simpan Data';
    });
}


// ===================================================================
// ROUTER FRONTEND (DOMContentLoaded)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupBackButton(); 

    const path = window.location.pathname.split('/').pop();
    switch(path) {
        case 'login.html':
        case '': // Menangani root path jika ada
             handleLoginPage(); break;
        case 'dashboard-admin.html': handleAdminDashboardPage(); break;
        case 'dashboard-user.html': handleUserDashboardPage(); break;
        case 'data_pelanggan.html': handleDataPelangganPage(); break;
        case 'detail_pelanggan.html': handleDetailPelangganPage(); break;
        case 'tambah-pekerjaan.html': handleAddWorkPage(); break;
        case 'pekerjaan.html': handleWorkListPage(); break; 
        case 'berita-acara.html': handleBeritaAcaraPage(); break;
        case 'kerjakan_pekerjaan.html': handleKerjakanPekerjaanPage(); break;
        case 'detail_pekerjaan.html': handleWorkDetailPage(); break;
        case 'isi_data_pekerjaan.html': handleIsiDataPage(); break;
        // Pastikan nama file ini sesuai dengan file HTML checklist Anda
        case 'isi_foto_pekerjaan.html': handleIsiFotoPage(); break;
    }
});