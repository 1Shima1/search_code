/* ============================================================
   НАСТРОЙКИ — МЕНЯЙ ТОЛЬКО ЗДЕСЬ
   ============================================================ */

const IS_DEMO = true;  // ← поменяй на false когда подключишь 1С

const API_URL = 'http://ВАШ_СЕРВЕР_1С/hs/bonus/card';
// Программист 1С должен сделать HTTP-сервис, который принимает:
// GET /hs/bonus/card?phone=79001234567
// И возвращает JSON:
// {
//   "found": true,
//   "name": "Иванов Иван",
//   "cardNumber": "2700008150049",
//   "cardType": "Стандарт",
//   "prefix": "i"
// }
// Если не найдено: { "found": false }

const DEMO_DATA = {
    '79001234567': {
        found: true,
        name: 'Иванов Иван Петрович',
        cardNumber: '2700008150049',
        cardType: 'Стандарт',
        prefix: 'i'
    },
    '79112223344': {
        found: true,
        name: 'Петрова Мария',
        cardNumber: '2700009876543',
        cardType: 'Золотая',
        prefix: 'i'
    },
    '79031112233': {
        found: true,
        name: 'Сидоров Алексей',
        cardNumber: '2700001122334',
        cardType: 'Стандарт',
        prefix: 'a'
    }
};

/* ============================================================ */

function cleanPhone(raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('8') && digits.length === 11) return '7' + digits.slice(1);
    if (digits.startsWith('7') && digits.length === 11) return digits;
    if (digits.length === 10) return '7' + digits;
    return digits;
}

function setState(name) {
    ['loading', 'notfound', 'error', 'result'].forEach(s => {
        document.getElementById('state-' + s).classList.remove('active');
    });
    if (name) document.getElementById('state-' + name).classList.add('active');
}

async function fetchFromDemo(phone) {
    await new Promise(r => setTimeout(r, 700));
    return DEMO_DATA[phone] || { found: false };
}

async function fetchFrom1C(phone) {
    const url = API_URL + '?phone=' + phone;
    const resp = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
}

function renderResult(data, phone) {
    const barcodeValue = (data.prefix || 'i') + data.cardNumber;
    const initials = data.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

    document.getElementById('result-avatar').textContent = initials;
    document.getElementById('result-name').textContent = data.name;
    document.getElementById('result-phone').textContent = '+' + phone.replace(/(\d)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    document.getElementById('result-cardnum').textContent = data.cardNumber;
    document.getElementById('result-cardtype').textContent = data.cardType || '—';
    document.getElementById('result-barcode-val').textContent = barcodeValue;

    JsBarcode('#barcode', barcodeValue, {
        format: 'CODE128',
        lineColor: '#000000',
        width: 2.5,
        height: 90,
        displayValue: true,
        fontSize: 14,
        margin: 12,
        background: '#ffffff'
    });
}

async function search() {
    const raw = document.getElementById('phone').value;
    const phone = cleanPhone(raw);

    if (phone.length < 10) {
        document.getElementById('phone').focus();
        document.getElementById('phone').style.borderColor = '#EF4444';
        setTimeout(() => document.getElementById('phone').style.borderColor = '', 1000);
        return;
    }

    const btn = document.getElementById('search-btn');
    btn.disabled = true;
    setState('loading');

    try {
        const data = IS_DEMO ? await fetchFromDemo(phone) : await fetchFrom1C(phone);

        if (!data.found) {
            setState('notfound');
        } else {
            renderResult(data, phone);
            setState('result');
        }
    } catch (e) {
        document.getElementById('error-detail').textContent = e.message || 'Нет соединения с сервером 1С';
        setState('error');
    } finally {
        btn.disabled = false;
    }
}

function copyBarcode() {
    const val = document.getElementById('result-barcode-val').textContent;
    navigator.clipboard.writeText(val).then(() => {
        const btn = event.currentTarget;
        const orig = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"><polyline points="20 6 9 17 4 12"/></svg> Скопировано';
        setTimeout(() => btn.innerHTML = orig, 1500);
    });
}

function downloadBarcode() {
    const svg = document.getElementById('barcode');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = svg.getAttribute('width') || 400;
    canvas.height = svg.getAttribute('height') || 150;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = function () {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        const label = document.getElementById('result-barcode-val').textContent || 'barcode';
        a.download = label + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    };
    img.src = url;
}

document.getElementById('phone').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') search();
});