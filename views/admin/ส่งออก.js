// ฟังก์ชันส่งออก CSV (Excel)
function exportData() {
    const statusValue = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('carSearch').value.toLowerCase();

    // กรองข้อมูลตามที่เลือกบนหน้าเว็บ
    const filteredData = allCars.filter(car => {
        const matchesStatus = statusValue === "all" || car.status === statusValue;
        const matchesSearch = car.brand.toLowerCase().includes(searchTerm) || 
                              car.plate.toLowerCase().includes(searchTerm) ||
                              car.owner.toLowerCase().includes(searchTerm);
        return matchesStatus && matchesSearch;
    });

    if (filteredData.length === 0) {
        alert("ไม่มีข้อมูลสำหรับการส่งออก");
        return;
    }

    let csvContent = "\uFEFF"; // รองรับภาษาไทยใน Excel
    csvContent += "ยี่ห้อและรุ่น,ปี,ทะเบียนรถ,หมายเลขตัวถัง(VIN),เจ้าของรถ,สถานะ,เข้าบริการล่าสุด\n";

    filteredData.forEach(car => {
        const row = [
            `"${car.brand} ${car.model}"`,
            `"${car.year}"`,
            `"${car.plate}"`,
            `"${car.vin}"`,
            `"${car.owner}"`,
            `"${car.status}"`,
            `"${car.lastService}"`
        ].join(",");
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `สรุปรายการรถยนต์_${new Date().toLocaleDateString('th-TH')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ฟังก์ชันส่งออก PDF (พิมพ์หน้าเว็บ)
function exportPDF() {
    const originalTitle = document.title;
    document.title = "รายงานสรุปรายการรถยนต์ - BT Auto Service";
    window.print();
    document.title = originalTitle;
}