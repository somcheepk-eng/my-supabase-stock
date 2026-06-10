// 🔑 1. คอนฟิกเชื่อมต่อระบบคลาวด์ Supabase
const SUPABASE_URL = "https://cqcnpuwpozqwmwgufxzn.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY25wdXdwb3pxd213Z3VmeHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODMxNTgsImV4cCI6MjA5NjU1OTE1OH0.3A_C2Og_sxHHmgb4dIFsMjQHzrdCbtOKvVwgiuviB1c"; 

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ตัวแปรระบบค้นหาและแบ่งหน้าแสดงผล
let masterStockData = []; 
let masterLogsData = [];  
let filteredStock = [];   
let filteredLogs = [];    

const rowsPerPage = 5;    
let currentStockPage = 1;
let currentLogsPage = 1;
let currentUserName = "Admin"; 

// เมื่อหน้าเว็บโหลดเสร็จ
$(document).ready(function() {
    $('#searchStock').on('input', function() {
        const keyword = $(this).val().toLowerCase();
        filteredStock = masterStockData.filter(item => 
            (item.Name && item.Name.toLowerCase().includes(keyword)) || 
            (item.Size && item.Size.toLowerCase().includes(keyword))
        );
        currentStockPage = 1;
        renderStockTable();
    });

    $('#searchLogs').on('input', function() {
        const keyword = $(this).val().toLowerCase();
        filteredLogs = masterLogsData.filter(log => 
            (log.item_name && log.item_name.toLowerCase().includes(keyword)) ||
            (log.user && log.user.toLowerCase().includes(keyword))
        );
        currentLogsPage = 1;
        renderLogsTable();
    });
});

// ==========================================
// 🔐 ฟังก์ชัน: ตรวจสอบปุ่มและค่าว่าง (doLogin)
// ==========================================
async function doLogin() {
    const username = $('#user').val() ? $('#user').val().trim() : '';
    const password = $('#pass').val() ? $('#pass').val().trim() : '';

    if (username === '' || password === '') {
        Swal.fire('คำเตือน', 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน', 'warning');
        return;
    }

    Swal.fire({
        title: 'กำลังตรวจสอบข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const isSuccess = await loginProcess(username, password);
    Swal.close(); 

    if (isSuccess) {
        $('#userNameDisplay').html(`<i class="bi bi-person-circle"></i> คุณ: ${currentUserName}`);
        $('#loginPage').addClass('hidden');
        $('#mainPage').removeClass('hidden');
        loadStockData();
        loadLogsData();
    }
}

// ==========================================
// 🔐 ฟังก์ชัน: เชื่อมต่อฐานข้อมูลตรวจสอบรหัส (loginProcess)
// ==========================================
async function loginProcess(username, password) {
    try {
        const { data: Users, error } = await supabase
            .from('Users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single(); 

        if (error || !Users) {
            Swal.fire('ล้มเหลว', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
            return false;
        } else {
            currentUserName = Users.fullname || username; 
            Swal.fire('สำเร็จ', `ยินดีต้อนรับคุณ ${currentUserName}`, 'success');
            return true;
        }
    } catch (err) {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
        return false;
    }
}

// ==========================================
// 📊 ฟังก์ชัน: ดึงข้อมูลคลังสินค้า (Materials)
// ==========================================
async function loadStockData() {
    $('#dataTable').html('<tr><td colspan="5" class="text-center text-muted">กำลังดึงข้อมูลคลัง...</td></tr>');

    const { data: Materials, error } = await supabase
        .from('Materials')
        .select('*')
        .order('Name', { ascending: true }); // แก้เป็น Name ตัวใหญ่

    if (error) {
        $('#dataTable').html(`<tr><td colspan="5" class="text-center text-danger">เกิดข้อผิดพลาด: ${error.message}</td></tr>`);
        return;
    }

    masterStockData = Materials;
    filteredStock = Materials;
    renderStockTable();
}

function renderStockTable() {
    const startIndex = (currentStockPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredStock.length);
    const pageData = filteredStock.slice(startIndex, endIndex);

    let html = '';
    if (pageData.length === 0) {
        html = '<tr><td colspan="5" class="text-center text-muted">ไม่พบข้อมูลรายการคลัง</td></tr>';
    } else {
        pageData.forEach(row => {
            // ปรับแก้ตัวแปรให้ขึ้นต้นด้วยตัวพิมพ์ใหญ่ตามตารางจริงใน Supabase
            let imgDisplay = row.Img_url ? row.Img_url : 'https://via.placeholder.com/40?text=No';
            html += `
            <tr style="vertical-align: middle;">
                <td><img src="${imgDisplay}" class="stock-item-icon"></td>
                <td>
                    <div class="fw-bold text-dark">${row.Name || '-'}</div>
                    <div class="text-primary small fw-bold">ขนาด: ${row.Size || '-'}</div>
                    <div class="text-muted small">หมวดหมู่: ${row.Category || 'วัสดุกลาง'}</div>
                </td>
                <td><span class="badge-qty">${row.Qty || 0} ${row.Unit || 'หน่วย'}</span></td>
                <td><span class="badge bg-light text-dark">${row.Expire_date || '-'}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-warning" onclick="manageStock('${row.ID}', '${row.Name}', ${row.Qty}, '${row.Unit}')">เบิก/รับ</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${row.ID}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        });
    }
    $('#dataTable').html(html);
    $('#stockInfo').text(`แสดง ${filteredStock.length ? startIndex + 1 : 0} ถึง ${endIndex} จากทั้งหมด ${filteredStock.length} รายการ`);
    renderPagination('stockPagination', filteredStock.length, currentStockPage, (p) => { currentStockPage = p; renderStockTable(); });
}

// ==========================================
// 📈 ฟังก์ชัน: เบิก/รับสต็อก + บันทึกประวัติลง Logs
// ==========================================
function manageStock(id, itemName, currentQty, itemUnit) {
    Swal.fire({
        title: `จัดการสต็อก: ${itemName}`,
        html: `
            <p>คงเหลือปัจจุบัน: <b>${currentQty} ${itemUnit}</b></p>
            <select id="swal-type" class="form-select mb-3">
                <option value="รับเข้า">🔄 รับเข้าสต็อก (+)</option>
                <option value="เบิกออก">📉 เบิกจ่ายออก (-)</option>
            </select>
            <input id="swal-qty" type="number" class="form-control" placeholder="ใส่จำนวนที่ต้องการ" min="1">
        `,
        showCancelButton: true,
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const type = document.getElementById('swal-type').value;
            const changeQty = parseInt(document.getElementById('swal-qty').value);
            if (!changeQty || changeQty <= 0) {
                Swal.showValidationMessage('กรุณาใส่จำนวนที่ถูกต้อง');
            }
            return { type, changeQty };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { type, changeQty } = result.value;
            let newQty = (type === "เบิกออก") ? currentQty - changeQty : currentQty + changeQty;

            if (newQty < 0) {
                Swal.fire('ข้อผิดพลาด', 'จำนวนในสต็อกไม่พอสำหรับการเบิกออก', 'error');
                return;
            }

            Swal.showLoading();

            const { error: updateError } = await supabase
                .from('Materials')
                .update({ Qty: newQty }) // แก้เป็น Qty ตัวใหญ่
                .eq('ID', id); // แก้เป็น ID ตัวใหญ่

            if (updateError) {
                Swal.fire('ล้มเหลว', updateError.message, 'error');
                return;
            }

            await supabase
                .from('Logs')
                .insert([
                    { 
                        material_id: id, 
                        item_name: itemName, 
                        type: type, 
                        change_qty: changeQty, 
                        unit: itemUnit, 
                        user: currentUserName 
                    }
                ]);

            Swal.fire('สำเร็จ', `อัปเดตสต็อกสำเร็จ คงเหลือ: ${newQty} ${itemUnit}`, 'success');
            loadStockData();
            loadLogsData();
        }
    });
}

// ==========================================
// 📥 ฟังก์ชัน: บันทึกรายการวัสดุใหม่ (Insert)
// ==========================================
async function submitForm() {
    const form = document.getElementById('stockForm');
    const name = form.name.value.trim();
    const size = form.size.value.trim();
    const category = form.category.value;
    const qty = parseInt(form.qty.value);
    const unit = form.unit.value.trim();
    const expiry = form.expiry.value || null;

    if (!name || isNaN(qty)) {
        Swal.fire('คำเตือน', 'กรุณากรอกข้อมูล ชื่อวัสดุ และจำนวน ให้ครบถ้วน', 'warning');
        return;
    }

    Swal.showLoading();
    let imageUrl = ""; 

    // แก้โครงสร้างฝั่ง Key ให้เป็นตัวพิมพ์ใหญ่ตามตารางจริงใน Supabase
    const { error } = await supabase
        .from('Materials')
        .insert([{ Name: name, Size: size, Category: category, Qty: qty, Unit: unit, Expire_date: expiry, Status: "ปกติ", Img_url: imageUrl }]);

    if (error) {
        Swal.fire('เกิดข้อผิดพลาด', error.message, 'error');
    } else {
        Swal.fire('สำเร็จ', 'บันทึกข้อมูลเข้าสู่ฐานข้อมูลเรียบร้อยแล้ว', 'success');
        form.reset();
        loadStockData();
    }
}

// ==========================================
// 🕒 ฟังก์ชัน: ดึงประวัติ Logs
// ==========================================
async function loadLogsData() {
    const { data: Logs, error } = await supabase
        .from('Logs')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error && Logs) {
        masterLogsData = Logs;
        filteredLogs = Logs;
        renderLogsTable();
    }
}

function renderLogsTable() {
    const startIndex = (currentLogsPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredLogs.length);
    const pageData = filteredLogs.slice(startIndex, endIndex);

    let html = '';
    if (pageData.length === 0) {
        html = '<tr><td colspan="5" class="text-center text-muted">ไม่พบข้อมูลประวัติการทำรายการ</td></tr>';
    } else {
        pageData.forEach(row => {
            let dateStr = row.created_at ? new Date(row.created_at).toLocaleString('th-TH') : '-';
            let badgeColor = row.type === 'รับเข้า' ? 'bg-success' : 'bg-danger';
            html += `
            <tr>
                <td><small>${dateStr}</small></td>
                <td><b>${row.item_name}</b></td>
                <td><span class="badge ${badgeColor}">${row.type}</span></td>
                <td><b>${row.change_qty}</b> ${row.unit || ''}</td>
                <td><span class="text-muted"><i class="bi bi-person"></i> ${row.user}</span></td>
            </tr>`;
        });
    }
    $('#logsTableBody').html(html);
    $('#logsInfo').text(`แสดง ${filteredLogs.length ? startIndex + 1 : 0} ถึง ${endIndex} จากทั้งหมด ${filteredLogs.length} รายการ`);
    renderPagination('logsPagination', filteredLogs.length, currentLogsPage, (p) => { currentLogsPage = p; renderLogsTable(); });
}

// ==========================================
// 🗑️ ฟังก์ชัน: ลบรายการสินค้า (Delete)
// ==========================================
async function deleteItem(id) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "รายการนี้จะถูกลบออกจากคลังถาวร ไม่สามารถย้อนกลับได้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.showLoading();
            const { error } = await supabase.from('Materials').delete().eq('ID', id); // แก้เป็น ID ตัวใหญ่

            if (error) {
                Swal.fire('ล้มเหลว', error.message, 'error');
            } else {
                Swal.fire('ลบแล้ว!', 'ลบข้อมูลสำเร็จ', 'success');
                loadStockData();
            }
        }
    });
}

// ==========================================
// 📑 ฟังก์ชันเสริม: สร้างปุ่มเปลี่ยนหน้า (Pagination)
// ==========================================
function renderPagination(elementId, totalRows, currentPage, onPageClick) {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    let html = '';
    
    if(totalPages <= 1) {
        $(`#${elementId}`).html('');
        return;
    }

    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-item page-link" href="#" onclick="event.preventDefault();">ก่อนหน้า</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-item page-link" href="#" onclick="event.preventDefault();">ถัดไป</a></li>`;
    
    $(`#${elementId}`).html(html);

    $(`#${elementId} .page-link`).on('click', function(e) {
        e.preventDefault();
        const p = $(this).data('page');
        if(p) onPageClick(p);
    });
}

// ==========================================
// 🚪 ฟังก์ชัน: ออกจากระบบ (Logout)
// ==========================================
function confirmLogout() {
    Swal.fire({
        title: 'ยืนยันการออกจากระบบ?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ออก',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#user').val('');
            $('#pass').val('');
            $('#mainPage').addClass('hidden');
            $('#loginPage').removeClass('hidden');
        }
    });
}
