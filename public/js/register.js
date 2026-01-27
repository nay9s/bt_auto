const passwordField = document.getElementById('passwordField');
const passwordConfirm = document.getElementById('confirmPassword');
const passwordNotice = document.getElementById('passwordNotice');

let typingTimer;
const delay = 300;

function validatePassword(password) {
    if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    if (!/[a-z]/.test(password)) return 'รหัสผ่านต้องมีตัวพิมพ์เล็ก';
    if (!/[A-Z]/.test(password)) return 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่';
    if (!/[0-9]/.test(password)) return 'รหัสผ่านต้องมีตัวเลข';
    if (!/[^a-zA-Z0-9]/.test(password)) return 'รหัสผ่านต้องมีอักขระพิเศษ';
    if (/\s/.test(password)) return 'รหัสผ่านห้ามมีช่องว่าง';
    return '';
}

function validateAll() {
    const password = passwordField.value;
    const confirm = passwordConfirm.value;

    const passwordError = validatePassword(password);
    if (passwordError) {
        passwordNotice.textContent = passwordError;
        return;
    }
    if (confirm && password !== confirm) {
        passwordNotice.textContent = 'รหัสผ่านไม่ตรงกัน';
        return;
    }

    if (password && confirm) {
        passwordNotice.textContent = '';
    }
}

function handleTyping() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(validateAll, delay);
}

passwordField.addEventListener('input', handleTyping);
passwordConfirm.addEventListener('input', handleTyping);