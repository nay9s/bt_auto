// เพิ่มรถ.js

const modal = document.getElementById('addCarModal');
const modalContent = document.getElementById('modalContent');
const addCarForm = document.getElementById('addCarForm');
const carTableBody = document.querySelector('#carTable tbody');
const statusFilter = document.getElementById('statusFilter'); // ดึงตัวกรองสถานะ

// 1. ข้อมูลรถยนต์ทั้งหมด
const allCars = [
    { brand: 'Toyota', model: 'Camry', type: 'sedan', year: 2020, plate: 'ABC-1234', vin: '1HGBH41JXMN109186', owner: 'John Smith', status: 'พร้อมใช้งาน', lastService: '25-11-2025' },
    { brand: 'Honda', model: 'Civic', type: 'sedan', year: 2019, plate: 'XYZ-5678', vin: '2HGFG12848H502460', owner: 'Sarah Johnson', status: 'กำลังซ่อม', lastService: '25-11-2025' },
    { brand: 'Ford', model: 'F-150', type: 'Truck', year: 2021, plate: 'DEF-9012', vin: '1FTFW1ET5TFC10312', owner: 'Milk Wilson', status: 'เสร็จสิ้นแล้ว', lastService: '26-11-2025' },
    { brand: 'Chevrolet', model: 'Silverado', type: 'Truck', year: 2022, plate: 'GHI-3456', vin: '1GCUYGEL5NZ123456', owner: 'Emily Brown', status: 'พร้อมใช้งาน', lastService: '26-11-2025' },
    { brand: 'BMW', model: 'Series 5', type: 'sedan', year: 2023, plate: 'กข-999', vin: 'WBA5341000L123456', owner: 'สมชาย ใจดี', status: 'กำลังซ่อม', lastService: '27-01-2026' },
    { brand: 'Tesla', model: 'Model 3', type: 'electric', year: 2022, plate: 'EV-101', vin: '5YJ3E1EB2LF123456', owner: 'มานะ มานี', status: 'พร้อมใช้งาน', lastService: '20-01-2026' },
    { brand: 'Isuzu', model: 'D-Max', type: 'Truck', year: 2021, plate: 'ผห-4455', vin: 'MP1TF57G0L123456', owner: 'วิชัย มั่นคง', status: 'เสร็จสิ้นแล้ว', lastService: '15-12-2025' },
    { brand: 'Mazda', model: 'CX-5', type: 'SUV', year: 2020, plate: '7กก-123', vin: 'JM7KF24L0L123456', owner: 'นารี รุ่งเรือง', status: 'พร้อมใช้งาน', lastService: '10-01-2026' },
    { brand: 'Nissan', model: 'Almera', type: 'sedan', year: 2021, plate: '9กข-888', vin: 'MNTCC12345L123456', owner: 'ปิติ รักษ์ดี', status: 'พร้อมใช้งาน', lastService: '05-01-2026' }
];

let currentPage = 1;
const rowsPerPage = 4;

// 2. ฟังก์ชันเปิด/ปิด Modal
function openModal() {
    modal.classList.remove('hidden');
    setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeModal() {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

window.onclick = function(event) {
    if (event.target == modal) closeModal();
}

// 3. ฟังก์ชันบันทึกข้อมูลใหม่จากฟอร์ม
addCarForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const newCar = {
        brand: this.brand.value,
        model: this.model.value,
        type: 'บันทึกใหม่',
        year: this.year.value,
        plate: this.plate.value,
        vin: this.vin.value,
        owner: this.owner.value,
        status: 'พร้อมใช้งาน',
        lastService: new Date().toLocaleDateString('th-TH')
    };

    allCars.unshift(newCar); 
    currentPage = 1;
    renderTable(currentPage);
    
    closeModal();
    addCarForm.reset();
    alert('บันทึกข้อมูลรถ ' + newCar.plate + ' เรียบร้อยแล้ว!');
});

// 4. ฟังก์ชันสำหรับวาดตาราง (ปรับปรุงให้รองรับการ Filter)
function renderTable(page) {
    const filter = document.getElementById('carSearch').value.toLowerCase();
    const statusVal = statusFilter.value;

    // กรองข้อมูลตาม Search และ Status พร้อมกัน
    const filteredData = allCars.filter(car => {
        const matchesSearch = car.brand.toLowerCase().includes(filter) || 
                              car.model.toLowerCase().includes(filter) || 
                              car.plate.toLowerCase().includes(filter);
        const matchesStatus = statusVal === "all" || car.status === statusVal;
        return matchesSearch && matchesStatus;
    });

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = filteredData.slice(start, end);

    carTableBody.innerHTML = ''; 

    paginatedItems.forEach(car => {
        const statusClass = car.status === 'พร้อมใช้งาน' ? 'bg-green-50 text-green-600 border-green-100' : 
                           car.status === 'กำลังซ่อม' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                           'bg-gray-50 text-gray-400 border-gray-200';

        carTableBody.innerHTML += `
            <tr class="car-row hover:bg-gray-50 transition cursor-pointer">
                <td class="px-6 py-5">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-50 flex items-center justify-center rounded-lg">
                    <img src="main/carblue.png" class="w-6 h-6 object-contain" alt="Car Icon">
                </div>
                <div class="text-left">
                    <p class="font-bold text-gray-800 car-name text-xl">${car.brand} ${car.model}</p>
                    <p class="text-xl text-gray-400 italic">${car.type}</p>
                </div>
            </div>
        </td>
        <td class="px-6 py-5 text-lg">${car.year}</td>
        <td class="px-6 py-5 text-lg"><span class="plate-number">${car.plate}</span></td>
        <td class="px-6 py-5 font-mono text-base">${car.vin}</td>
        <td class="px-6 py-5 text-xl">${car.owner}</td>
        <td class="px-6 py-5 text-center">
            <span class="px-3 py-1 rounded-full text-xl font-bold border ${statusClass}">${car.status}</span>
        </td>
        <td class="px-6 py-5 text-gray-500 text-xl">${car.lastService}</td>
            </tr>
        `;
    });

    renderPagination(filteredData.length);
    document.getElementById('rowCountDisplay').innerText = `แสดง ${filteredData.length > 0 ? start + 1 : 0} ถึง ${Math.min(end, filteredData.length)} จาก ${filteredData.length} รายการ`;
    document.getElementById('rowCountDisplay').className = "text-xl text-gray-500";
}

// 5. ฟังก์ชันสร้างปุ่ม Pagination (ปรับปรุงให้รับค่าจำนวนรายการที่กรองแล้ว)
function renderPagination(totalItems) {
    const pageCount = Math.ceil(totalItems / rowsPerPage);
    const controls = document.getElementById('paginationControls');
    controls.innerHTML = '';

    if (pageCount <= 1) return; // ไม่แสดงปุ่มถ้ามีหน้าเดียว

    const prevBtn = document.createElement('button');
    prevBtn.innerText = 'ย้อนกลับ';
    prevBtn.className = `text-xl px-3 py-1 border border-gray-200 rounded hover:bg-white transition ${currentPage === 1 ? 'opacity-50 cursor-not-allowed ' : ''}`;
    prevBtn.onclick = () => { if(currentPage > 1) { currentPage--; renderTable(currentPage); } };
    controls.appendChild(prevBtn);

    for (let i = 1; i <= pageCount; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.className = `px-3 py-1 border border-gray-200 rounded transition ${currentPage === i ? 'bg-green-500 text-white font-bold text-4xl' : 'hover:bg-white'}`;
        btn.onclick = () => { currentPage = i; renderTable(currentPage); };
        controls.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.innerText = 'ถัดไป';
    nextBtn.className = `text-xl px-3 py-1 border border-gray-200 rounded hover:bg-white transition ${currentPage === pageCount ? 'opacity-50 cursor-not-allowed ' : ''}`;
    nextBtn.onclick = () => { if(currentPage < pageCount) { currentPage++; renderTable(currentPage); } };
    controls.appendChild(nextBtn);
}

// 6. จัดการการค้นหาและการกรองสถานะ
document.getElementById('carSearch').addEventListener('keyup', function() {
    currentPage = 1; // รีเซ็ตไปหน้าแรกเสมอเมื่อค้นหา
    renderTable(currentPage);
});

statusFilter.addEventListener('change', function() {
    currentPage = 1; // รีเซ็ตไปหน้าแรกเสมอเมื่อเปลี่ยนสถานะ
    renderTable(currentPage);
});

// โหลดข้อมูลเริ่มต้น
renderTable(1);