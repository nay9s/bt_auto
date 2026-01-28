// ข้อมูลรายได้.js

// 1. เตรียมข้อมูลสำหรับแต่ละช่วงเวลา
const dataByTime = {
    'รายวัน': {
        revenue: [1200, 1500, 1100, 1800, 2000, 1300, 1700, 1400, 1600, 1900, 2100, 1500],
        expenses: [800, 900, 700, 1000, 1200, 850, 950, 800, 900, 1100, 1300, 900],
        summary: { totalRev: '฿15,000', totalExp: '฿10,000', profit: '฿5,000', cash: '฿15,000' },
        donut: [5000, 3000, 1000, 1000]
    },
    'รายสัปดาห์': {
        revenue: [8000, 9500, 11000, 7500, 8200, 9000, 10500, 8800, 9200, 11500, 10000, 9800],
        expenses: [5000, 6000, 7500, 5500, 5800, 6200, 7000, 6000, 6500, 8000, 7200, 6800],
        summary: { totalRev: '฿120,000', totalExp: '฿80,000', profit: '฿40,000', cash: '฿120,000' },
        donut: [40000, 25000, 10000, 5000]
    },
    'รายเดือน': {
        revenue: [45, 52, 68, 85, 82, 48, 92, 42, 60, 75, 84, 65],
        expenses: [25, 38, 45, 55, 60, 22, 48, 35, 20, 42, 45, 40],
        summary: { totalRev: '฿450,000', totalExp: '฿180,000', profit: '฿270,000', cash: '฿450,000' },
        donut: [120000, 70000, 50000, 30000]
    },
    'รายปี': {
        revenue: [500000, 620000, 750000, 810000, 900000, 850000, 950000, 880000, 920000, 1100000, 1200000, 1300000],
        expenses: [300000, 400000, 500000, 550000, 600000, 580000, 650000, 600000, 620000, 750000, 800000, 850000],
        summary: { totalRev: '฿5,400,000', totalExp: '฿2,100,000', profit: '฿3,300,000', cash: '฿5,400,000' },
        donut: [1200000, 500000, 300000, 100000]
    }
};

// 2. วาดกราฟแท่ง (Bar Chart)
const ctxBar = document.getElementById('revenueChart').getContext('2d');
const revenueChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
        labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
        datasets: [
            { label: 'รายได้', data: dataByTime['รายเดือน'].revenue, backgroundColor: '#00E396', borderRadius: 5, barPercentage: 0.8, categoryPercentage: 0.8 },
            { label: 'ค่าใช้จ่าย', data: dataByTime['รายเดือน'].expenses, backgroundColor: '#FF4560', borderRadius: 5, barPercentage: 0.8, categoryPercentage: 0.8 }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { display: false } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 18, family: 'Kanit', weight: 'bold' } } }
        }
    }
});

// 3. วาดกราฟวงกลม (Donut Chart)
const ctxDonut = document.getElementById('expenseDonutChart').getContext('2d');
const expenseDonutChart = new Chart(ctxDonut, {
    type: 'doughnut',
    data: {
        labels: ['ค่าอะไหล่', 'ค่าแรง', 'ค่าเช่า', 'น้ำไฟ'],
        datasets: [{
            data: dataByTime['รายเดือน'].donut,
            backgroundColor: ['#FF4560', '#775DD0', '#FEB019', '#008FFB'],
            borderWidth: 0,
            hoverOffset: 10
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: { legend: { display: false } }
    }
});

// 4. ฟังก์ชันควบคุมปุ่มกดสลับข้อมูล
const timeButtons = document.querySelectorAll('.time-btn');
timeButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        // สลับสีปุ่ม
        timeButtons.forEach(b => {
            b.classList.remove('bg-green-400', 'text-white', 'shadow-sm', 'font-medium', 'rounded-lg');
            b.classList.add('text-gray-400');
        });
        this.classList.remove('text-gray-400');
        this.classList.add('bg-green-400', 'text-white', 'shadow-sm', 'font-medium', 'rounded-lg');

        const selected = this.innerText.trim();
        const newData = dataByTime[selected];

        if (newData) {
            // อัปเดตกราฟแท่ง
            revenueChart.data.datasets[0].data = newData.revenue;
            revenueChart.data.datasets[1].data = newData.expenses;
            revenueChart.update();

            // อัปเดตตัวเลขใน Card สรุป (ใช้ ID ที่ตั้งใน HTML)
            document.getElementById('rev-text').innerText = newData.summary.totalRev;
            document.getElementById('exp-text').innerText = newData.summary.totalExp;
            document.getElementById('profit-text').innerText = newData.summary.profit;
            document.getElementById('cash-text').innerText = newData.summary.cash;

            // อัปเดตกราฟวงกลม
            expenseDonutChart.data.datasets[0].data = newData.donut;
            expenseDonutChart.update();

            // อัปเดตตัวเลขรวมกลางกราฟวงกลม
            document.getElementById('donut-total').innerText = newData.summary.totalExp;
        }
    });
});