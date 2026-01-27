const passwordField = document.getElementById('passwordField');
const confirmField = document.getElementById('confirmPassword');
const notice = document.getElementById('passwordNotice');
const registerButton = document.getElementById('submit');

const DELAY = 300;
let typingTimer;

registerButton.disabled = true;
registerButton.style.backgroundColor = 'gray';

function checkPassword(password) {
    if (!password) return 'กรุณากรอกรหัสผ่าน';
    if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    if (!/[a-z]/.test(password)) return 'รหัสผ่านต้องมีตัวพิมพ์เล็ก';
    if (!/[A-Z]/.test(password)) return 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่';
    if (!/[0-9]/.test(password)) return 'รหัสผ่านต้องมีตัวเลข';
    if (!/[^a-zA-Z0-9]/.test(password)) return 'รหัสผ่านต้องมีอักขระพิเศษ';
    if (/\s/.test(password)) return 'รหัสผ่านห้ามมีช่องว่าง';
    return null;
}

function validateForm() {
    const password = passwordField.value;
    const confirm = confirmField.value;

    registerButton.disabled = true;
    registerButton.style.backgroundColor = 'gray';

    const error = checkPassword(password);
    if (error) {
        notice.textContent = error;
        return;
    }

    if (!confirm) {
        notice.textContent = 'กรุณายืนยันรหัสผ่าน';
        return;
    }

    if (password !== confirm) {
        notice.textContent = 'รหัสผ่านไม่ตรงกัน';
        return;
    }

    notice.textContent = 'รหัสผ่านถูกต้อง';
    registerButton.disabled = false;
    registerButton.style.backgroundColor = '#02881A';
}

function handleInput() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(validateForm, DELAY);
}

passwordField.addEventListener('input', handleInput);
confirmField.addEventListener('input', handleInput);
