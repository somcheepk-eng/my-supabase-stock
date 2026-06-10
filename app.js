// 🔑 1. ค่าคอนฟิกเชื่อมต่อระบบคลาวด์ Supabase

const SUPABASE_URL = "https://cqcnpuwpozqwmwgufxzn.supabase.co"; // รหัสโปรเจกต์ของคุณ
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY25wdXdwb3pxd213Z3VmeHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODMxNTgsImV4cCI6MjA5NjU1OTE1OH0.3A_C2Og_sxHHmgb4dIFsMjQHzrdCbtOKvVwgiuviB1c"; // ใส่รหัส Anon Key ของคุณตรงนี้

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ตัวแปรเก็บชื่อผู้ใช้ที่กำลังล็อกอิน (เริ่มต้นเป็น Admin ตามโค้ดเดิมของคุณ)
let currentUserName = "Admin"; 

// เมื่อหน้าเว็บโหลดเสร็จ ให้เริ่มโหลดข้อมูลตารางทันที
$(document).ready(function() {
    loadStockData();
});

// ==========================================
// 📊 ฟังก์ชันมาแทน: getStockData() (ดึงข้อมูลคลัง)
// ==========================================
async function loadStockData() {
    $('#dataTable').html('<tr><td colspan="6" class="text-center text-muted">กำลังดึงข้อมูล...</td></tr>');

    const { data: Materials, error } = await supabase
        .from('Materials')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        $('#dataTable').html(`<tr><td colspan="6" class="text-center text-danger">เกิดข้อผิดพลาด: ${error.message}</td></tr>`);
        return;
    }

    let html = '';
    Materials.forEach(row => {
        let imgDisplay = row.image_url ? row.image_url : 'https://via.placeholder.com/40?text=No';
        html += `
        <tr style="vertical-align: middle;">
            <td><img src="${imgDisplay}" class="rounded" width="40" height="40"></td>
            <td>
                <div class="fw-bold text-dark">${row.name}</div>
                <div class="text-primary small fw-bold">ขนาด: ${row.size || '-'}</div>
                <div class="text-muted small">หมวดหมู่: ${row.category}</div>
            </td>
            <td><span class="badge bg-secondary fs-6">${row.qty} ${row.unit}</span></td>
            <td>${row.expiry_date || '-'}</td>
            <td><span class="badge bg-info">${row.status || 'ปกติ'}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-warning" onclick="manageStock('${row.id}', '${row.name}', ${row.qty}, '${row.unit}')">เบิก/รับ</button>
                <button class="btn btn-sm btn-outline-primary" onclick="openEditModal('${row.id}', '${row.name}', '${row.size}', '${row.category}', '${row.expiry_date}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${row.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
    $('#dataTable').html(html);
}

// ==========================================
// 🔐 ฟังก์ชันมาแทน: checkLogin() (ตรวจสอบสิทธิ์)
// ==========================================
async function loginProcess(username, password) {
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
        //  แก้ไข: เปลี่ยนจาก Users.name เป็น Users.fullname ให้ตรงกับหน้าตาราง Supabase
        currentUserName = Users.fullname || username; 
        Swal.fire('สำเร็จ', `ยินดีต้อนรับคุณ ${currentUserName}`, 'success');
        return true;
    }
}

// ==========================================
// 📥 ฟังก์ชันมาแทน: saveData() (บันทึกรายการวัสดุใหม่)
// ==========================================
async function submitForm() {
    const form = document.getElementById('stockForm');
    const name = form.name.value.trim();
    const size = form.size.value.trim();
    const category = form.category.value;
    const qty = parseInt(form.qty.value);
    const unit = form.unit.value.trim();
    const expiry = form.expiry.value || null;

    // หมายเหตุ: เรื่องการอัปโหลดรูปภาพ จะใช้ฐานข้อมูล Supabase Storage (อธิบายในหัวข้อถัดไป)
    let imageUrl = ""; 

    // สั่งเพิ่มข้อมูลลงตาราง 'Materials'
    const { error } = await supabase
        .from('Materials')
        .insert([
            { name: name, size: size, category: category, qty: qty, unit: unit, expiry_date: expiry, status: "ปกติ", image_url: imageUrl }
        ]);

    if (error) {
        Swal.fire('เกิดข้อผิดพลาด', error.message, 'error');
    } else {
        Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
        form.reset();
        loadStockData();
    }
}

// ==========================================
// 📈 ฟังก์ชันมาแทน: updateStock() (เบิก/รับสต็อก + บันทึกประวัติ)
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
            
            // ตรรกะคำนวณยอดตามโค้ดเดิมของคุณ
            let newQty = (type === "เบิกออก") ? currentQty - changeQty : currentQty + changeQty;

            if (newQty < 0) {
                Swal.fire('ข้อผิดพลาด', 'จำนวนในสต็อกไม่พอสำหรับการเบิก', 'error');
                return;
            }

            // สเต็ป 1: ปรับปรุงยอดในตาราง Materials
            const { error: updateError } = await supabase
                .from('Materials')
                .update({ qty: newQty })
                .eq('id', id);

            if (updateError) {
                Swal.fire('ล้มเหลว', updateError.message, 'error');
                return;
            }

            // สเต็ป 2: บันทึกประวัติกิจกรรมลงตาราง Logs อัตโนมัติ (เลียนแบบ appendRow)
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

            Swal.fire('สำเร็จ', `อัปเดตสำเร็จ! คงเหลือ: ${newQty}`, 'success');
            loadStockData();
        }
    });
}

// ==========================================
// 📝 ฟังก์ชันมาแทน: editMaterialDataV2() (แก้ไขข้อมูล)
// ==========================================
async function updateMaterialEdited(id, name, size, category, expiry) {
    const { error } = await supabase
        .from('Materials')
        .update({ name: name, size: size, category: category, expiry_date: expiry })
        .eq('id', id);

    if (error) {
        Swal.fire('ล้มเหลว', error.message, 'error');
    } else {
        Swal.fire('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อยแล้ว', 'success');
        loadStockData();
    }
}

// ==========================================
// 🗑️ ฟังก์ชันมาแทน: deleteItem() (ลบรายการสินค้า)
// ==========================================
async function deleteItem(id) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "รายการนี้จะถูกลบออกจากคลังระบบถาวร!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { error } = await supabase
                .from('Materials')
                .delete()
                .eq('id', id);

            if (error) {
                Swal.fire('ล้มเหลว', error.message, 'error');
            } else {
                Swal.fire('ลบแล้ว!', 'ลบรายการสำเร็จ', 'success');
                loadStockData();
            }
        }
    });
}
