// ==========================================
// 1. AUTH & INIT
// ==========================================
const CORRECT_PASSWORD = "Dev123";
const appState = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    beneficiaries: {}, stock: {}, matruMandalStock: {},
    centerInfo: { centerName: '', workerName: '', sejo: '', centerCode: '' }
};
const gujaratiMonths = ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઑગસ્ટ", "સપ્ટેમ્બર", "ઑક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"];
const gujaratiDays = ["રવિ", "સોમ", "મંગ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"];

document.addEventListener('DOMContentLoaded', function() {
    if (sessionStorage.getItem('appAuthenticated') === 'true') {
        showApp();
    } else {
        document.getElementById('passwordOverlay').style.display = 'flex';
    }
    document.getElementById('passwordSubmit').addEventListener('click', checkPassword);
    
    initializeAssistant();
    initUniversalVoiceBtn();
});

function checkPassword() {
    if (document.getElementById('passwordInput').value.trim() === CORRECT_PASSWORD) {
        sessionStorage.setItem('appAuthenticated', 'true');
        showApp();
    } else {
        showToast("ખોટો પાસવર્ડ!", "error");
    }
}

function showApp() {
    document.getElementById('passwordOverlay').style.display = 'none';
    const today = new Date().toISOString().split('T')[0];
    ['currentDate', 'certificateDate', 'reportDate'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).value = today;
    });
    initializeSelectors();
    loadCalendar();
    loadStockData();
    loadMatruMandalStockData();
    loadCenterInfo();
}

function initializeSelectors() {
    const ids = ['monthSelector', 'yearSelector', 'stockMonthSelector', 'stockYearSelector', 'matruMandalStockMonthSelector', 'matruMandalStockYearSelector', 'reportMonthSelector', 'reportYearSelector', 'billMonthSelector', 'billYearSelector'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.innerHTML = '';
        if(id.includes('Month')) gujaratiMonths.forEach((m,i) => el.innerHTML += `<option value="${i}" ${i===appState.currentMonth?'selected':''}>${m}</option>`);
        else for(let y=2023; y<=2026; y++) el.innerHTML += `<option value="${y}" ${y===appState.currentYear?'selected':''}>${y}</option>`;
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`button[onclick="showPage('${pageId}')"]`);
    if(btn) btn.classList.add('active');
    
    if(pageId==='beneficiaryPage') loadCalendar();
    else if(pageId==='stockPage') loadStockData();
    else if(pageId==='matruMandalStockPage') loadMatruMandalStockData();
    else if(pageId==='billPage') calculateMasalaAmounts();
}

// ==========================================
// 2. AI ASSISTANT
// ==========================================
function initializeAssistant() {
    document.body.addEventListener('click', function(e) {
        if (e.target.closest('.assistant-icon')) {
            document.getElementById('aiAssistant').classList.add('active');
            speak("નમસ્તે!");
        }
        if (e.target.closest('.assistant-close')) {
            document.getElementById('aiAssistant').classList.remove('active');
            if('speechSynthesis' in window) window.speechSynthesis.cancel();
        }
    });

    const btn = document.createElement('button');
    btn.innerHTML = '<span class="material-icons">mic</span>';
    btn.style = "border:none; background:none; color:#FF6B6B; cursor:pointer;";
    btn.onclick = toggleChatVoice;
    const inputArea = document.querySelector('.assistant-input');
    if(inputArea) inputArea.prepend(btn);
}

function toggleChatVoice() {
    if('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const r = new SR(); r.lang='gu-IN';
        r.onstart = () => document.getElementById('assistantInput').placeholder = "સાંભળી રહ્યો છું...";
        r.onresult = (e) => {
            document.getElementById('assistantInput').value = e.results[0][0].transcript;
            sendMessage();
        };
        r.start();
    } else showToast("માઈક સપોર્ટ નથી", "error");
}

function handleAssistantKeypress(e) { if(e.key==='Enter') sendMessage(); }

function sendMessage() {
    const txt = document.getElementById('assistantInput').value;
    if(!txt) return;
    addMessage(txt, 'user');
    document.getElementById('assistantInput').value='';
    setTimeout(() => processSmartQuery(txt), 600);
}

function addMessage(t, s) {
    const d = document.createElement('div'); d.className = `message ${s}`; d.innerText = t;
    const c = document.getElementById('assistantMessages');
    c.appendChild(d); c.scrollTop = c.scrollHeight;
}

function speak(text) {
    if ('speechSynthesis' in window) {
        try { const u = new SpeechSynthesisUtterance(text); u.lang = 'gu-IN'; window.speechSynthesis.speak(u); } catch(e){}
    }
}

function processSmartQuery(query) {
    const q = query.toLowerCase();
    let resp = "હું સમજ્યો નહીં.";
    const m = appState.currentMonth;
    const y = appState.currentYear;
    const benData = JSON.parse(localStorage.getItem(`beneficiaries_${y}_${m}`)) || {};
    const stockData = JSON.parse(localStorage.getItem(`stock_${y}_${m}`)) || {};
    
    let item = null; let unit = "કિલો"; let itemName="";
    if (q.includes('ઘઉં')) { item='wheat'; itemName='ઘઉં'; }
    else if (q.includes('ચોખા')) { item='rice'; itemName='ચોખા'; }
    else if (q.includes('તેલ')) { item='oil'; itemName='તેલ'; unit="લિટર"; }
    else if (q.includes('ચણા')) { item='chana'; itemName='ચણા'; }
    else if (q.includes('દાળ')) { item='dal'; itemName='દાળ'; }

    if (item && (q.includes('વપરાશ') || q.includes('કેટલું'))) {
        let totalVal = 0;
        const days = new Date(y, m+1, 0).getDate();
        let isMorning = q.includes('સવાર');
        let isAfternoon = q.includes('બપોર');
        for(let d=1; d<=days; d++) {
            const date = new Date(y, m, d);
            const day = date.getDay();
            const count = benData[d] || 0;
            if(day===0 || count===0) continue;
            let mUse=0, aUse=0;
            if(item==='wheat') { if([1,3,4,5,6].includes(day)) mUse=0.030*count; if([1,2,5].includes(day)) aUse=0.050*count; }
            if(item==='rice') { if(day===2) mUse=0.030*count; if([3,4,6].includes(day)) aUse=0.050*count; }
            if(item==='oil') { if([1,2,3,4,5,6].includes(day)) { mUse=0.005*count; aUse=0.008*count; } }
            if(item==='chana' && [2,4,5].includes(day)) aUse=0.020*count;
            if(item==='dal' && [1,3].includes(day)) aUse=0.020*count;
            
            if (isMorning) totalVal += mUse;
            else if (isAfternoon) totalVal += aUse;
            else totalVal += (mUse + aUse);
        }
        resp = `આ મહિનામાં ${itemName}ની ${isMorning?"સવારની":(isAfternoon?"બપોરની":"કુલ")} વપરાશ ${totalVal.toFixed(3)} ${unit} છે.`;
    } 
    else if (q.includes('લાભાર્થી')) {
        let t = 0; for(let k in benData) t += benData[k];
        resp = `કુલ લાભાર્થી: ${t}`;
    }
    else if (q.includes('સ્ટોક')) {
        if(item) {
             let o = parseFloat(stockData[`${item}_open`])||0;
             let i = parseFloat(stockData[`${item}_income`])||0;
             resp = `${itemName}: ઓપનિંગ ${o}, આવક ${i}`;
        } else resp = "કોનો સ્ટોક?";
    }
    
    addMessage(resp, 'assistant');
    speak(resp);
}

// ==========================================
// 3. UNIVERSAL MIC
// ==========================================
function initUniversalVoiceBtn() {
    const btn = document.createElement('div');
    btn.className = 'voice-float-btn';
    btn.innerHTML = '<span class="material-icons">mic</span>';
    document.body.appendChild(btn);
    let activeInput;
    document.addEventListener('focusin', e => { if(e.target.tagName==='INPUT') activeInput = e.target; });
    
    if('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const r = new SR(); r.lang='gu-IN';
        btn.onclick = () => { if(activeInput){ try{r.start(); btn.classList.add('listening');}catch(e){} } else showToast("ખાના પર ક્લિક કરો","error"); };
        r.onend = () => btn.classList.remove('listening');
        r.onresult = e => {
            let t = e.results[0][0].transcript;
            if(activeInput.type==='number') t=t.replace(/[૦-૯]/g,d=>"0123456789"["૦૧૨૩૪૫૬૭૮૯".indexOf(d)]).replace(/[^0-9.]/g,'');
            activeInput.value = t; activeInput.dispatchEvent(new Event('input')); // Auto Save Trigger
        };
    } else btn.style.display='none';
}

// 4. CALENDAR
function changeMonth(offset) {
    let m = appState.currentMonth + offset;
    let y = appState.currentYear;
    if (m > 11) { m = 0; y++; } else if (m < 0) { m = 11; y--; }
    appState.currentMonth = m; appState.currentYear = y;
    initializeSelectors(); loadCalendar();
}

function loadCalendar() {
    document.getElementById('calendarMonthDisplay').textContent = gujaratiMonths[appState.currentMonth];
    document.getElementById('calendarYearDisplay').textContent = appState.currentYear;
    const key = `beneficiaries_${appState.currentYear}_${appState.currentMonth}`;
    appState.beneficiaries = JSON.parse(localStorage.getItem(key)) || {};
    const container = document.getElementById('calendarContainer');
    const firstDay = new Date(appState.currentYear, appState.currentMonth, 1).getDay();
    const daysInMonth = new Date(appState.currentYear, appState.currentMonth + 1, 0).getDate();
    let html = '<div class="calendar">';
    gujaratiDays.forEach(d => html += `<div class="calendar-header">${d}</div>`);
    for(let i=0; i<firstDay; i++) html += '<div></div>';
    for(let d=1; d<=daysInMonth; d++) {
        const dayOfWeek = new Date(appState.currentYear, appState.currentMonth, d).getDay();
        const count = appState.beneficiaries[d] || 0;
        let style = "calendar-day";
        if(dayOfWeek===0) style += " holiday";
        if(count>0) style += " has-beneficiaries";
        html += `<div class="${style}" onclick="editBeneficiaryCount(${d})">
                    <div>${d}</div><div style="font-size:0.8rem; margin-top:5px;">${count>0?count:'-'}</div>
                 </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
    updateTotalBeneficiaries();
}

function editBeneficiaryCount(d) {
    const dayOfWeek = new Date(appState.currentYear, appState.currentMonth, d).getDay();
    if(dayOfWeek===0) { showToast('રવિવારે રજા હોય!', 'error'); return; }
    const val = prompt(`તારીખ ${d} ના લાભાર્થી:`, appState.beneficiaries[d]||0);
    if(val !== null) {
        appState.beneficiaries[d] = parseInt(val) || 0;
        localStorage.setItem(`beneficiaries_${appState.currentYear}_${appState.currentMonth}`, JSON.stringify(appState.beneficiaries));
        loadCalendar();
    }
}
function updateTotalBeneficiaries() {
    let t = 0; for(let k in appState.beneficiaries) t += appState.beneficiaries[k];
    if(document.getElementById('totalCount')) document.getElementById('totalCount').innerText = t;
}

// 5. STOCK
function loadStockData() {
    const m = document.getElementById('stockMonthSelector').value;
    const y = document.getElementById('stockYearSelector').value;
    appState.stock = JSON.parse(localStorage.getItem(`stock_${y}_${m}`)) || {};
    ['wheat','rice','oil','chana','dal'].forEach(i => {
        if(document.getElementById(`${i}_open`)) document.getElementById(`${i}_open`).value = appState.stock[`${i}_open`] || '';
        if(document.getElementById(`${i}_income`)) document.getElementById(`${i}_income`).value = appState.stock[`${i}_income`] || '';
    });
    updateStockTotals();
}
function updateStockTotals() {
    let html = '';
    ['wheat','rice','oil','chana','dal'].forEach(i => {
        const o = parseFloat(document.getElementById(`${i}_open`)?.value)||0;
        const inc = parseFloat(document.getElementById(`${i}_income`)?.value)||0;
        html += `<div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee;"><span>${i.toUpperCase()}:</span><b>${(o+inc).toFixed(3)}</b></div>`;
    });
    document.getElementById('stockTotals').innerHTML = html;
}
function saveStockData() {
    ['wheat','rice','oil','chana','dal'].forEach(i => {
        appState.stock[`${i}_open`] = document.getElementById(`${i}_open`).value;
        appState.stock[`${i}_income`] = document.getElementById(`${i}_income`).value;
    });
    const m = document.getElementById('stockMonthSelector').value;
    const y = document.getElementById('stockYearSelector').value;
    localStorage.setItem(`stock_${y}_${m}`, JSON.stringify(appState.stock));
}
function clearStockData() { if(confirm("Sure?")){ appState.stock={}; saveStockData(); loadStockData(); }}

function loadMatruMandalStockData() {
    const m = document.getElementById('matruMandalStockMonthSelector').value;
    const y = document.getElementById('matruMandalStockYearSelector').value;
    appState.matruMandalStock = JSON.parse(localStorage.getItem(`matruMandalStock_${y}_${m}`)) || {};
    ['singdana','tal','gol'].forEach(i => {
        if(document.getElementById(`${i}_open`)) document.getElementById(`${i}_open`).value = appState.matruMandalStock[`${i}_open`] || '';
        if(document.getElementById(`${i}_income`)) document.getElementById(`${i}_income`).value = appState.matruMandalStock[`${i}_income`] || '';
    });
    updateMatruMandalStockTotals();
}
function updateMatruMandalStockTotals() {
    let html = '';
    ['singdana','tal','gol'].forEach(i => {
        const o = parseFloat(document.getElementById(`${i}_open`)?.value)||0;
        const inc = parseFloat(document.getElementById(`${i}_income`)?.value)||0;
        html += `<div style="display:flex; justify-content:space-between;"><span>${i}:</span><b>${(o+inc).toFixed(3)}</b></div>`;
    });
    document.getElementById('matruMandalStockTotals').innerHTML = html;
}
function saveMatruMandalStockData() {
    ['singdana','tal','gol'].forEach(i => {
        appState.matruMandalStock[`${i}_open`] = document.getElementById(`${i}_open`).value;
        appState.matruMandalStock[`${i}_income`] = document.getElementById(`${i}_income`).value;
    });
    const m = document.getElementById('matruMandalStockMonthSelector').value;
    const y = document.getElementById('matruMandalStockYearSelector').value;
    localStorage.setItem(`matruMandalStock_${y}_${m}`, JSON.stringify(appState.matruMandalStock));
}

// 6. REPORT
function generateReport(isDaily) {
    const container = document.getElementById('reportTableContainer');
    const m = parseInt(document.getElementById('reportMonthSelector').value);
    const y = parseInt(document.getElementById('reportYearSelector').value);
    const stockData = JSON.parse(localStorage.getItem(`stock_${y}_${m}`)) || {};
    const benData = JSON.parse(localStorage.getItem(`beneficiaries_${y}_${m}`)) || {};

    const items = [
        {id:'wheat', name:'ઘઉં', unit:'kg'}, 
        {id:'rice', name:'ચોખા', unit:'kg'}, 
        {id:'oil', name:'તેલ', unit:'lit'},
        {id:'chana', name:'ચણા', unit:'kg'}, 
        {id:'dal', name:'દાળ', unit:'kg'}
    ];

    let runningStock = {}, monthlyIncome = {}, totals = {};
    items.forEach(i => {
        runningStock[i.id] = parseFloat(stockData[`${i.id}_open`]) || 0;
        monthlyIncome[i.id] = parseFloat(stockData[`${i.id}_income`]) || 0;
        totals[i.id] = { income: monthlyIncome[i.id], morning:0, afternoon:0, cons:0, closing:0 };
    });

    let html = `<h3 style="text-align:center; color:#2c3e50; margin-bottom:10px;">${gujaratiMonths[m]} ${y}</h3>`;
    html += `<div style="overflow-x:auto; max-height: 70vh;">`;
    html += `<table class="wide-table">
                <thead>
                    <tr>
                        <th rowspan="2" style="position:sticky; left:0; z-index:10; background:#2c3e50; color:white;">તારીખ</th>
                        <th rowspan="2" style="position:sticky; left:35px; z-index:10; background:#2c3e50; color:white;">લાભાર્થી</th>`;
    items.forEach(i => html += `<th colspan="7" style="border-bottom:2px solid white;">${i.name}</th>`);
    html += `</tr><tr>`;
    items.forEach(() => html += `<th>ઓપ</th><th>આવક</th><th>કુલ</th><th>સવાર</th><th>બપોર</th><th>કુલ વપરાશ</th><th>બંધ</th>`);
    html += `</tr></thead><tbody>`;

    const days = new Date(y, m+1, 0).getDate();
    for(let d=1; d<=days; d++) {
        const date = new Date(y, m, d);
        const day = date.getDay();
        const count = benData[d] || 0;

        if(isDaily) {
            const selDate = new Date(document.getElementById('reportDate').value);
            if(date.getDate() !== selDate.getDate()) continue;
        }

        if(day===0) { 
             if(!isDaily || (isDaily && new Date(document.getElementById('reportDate').value).getDate() === d)) {
                 html += `<tr style="background:#ffebee;"><td style="position:sticky;left:0;background:#ffebee;">${d}</td><td style="position:sticky;left:35px;background:#ffebee;">રજા</td><td colspan="35" style="text-align:center; color:red; font-weight:bold;">રવિવાર</td></tr>`;
             }
             continue; 
        }

        let row = `<tr><td style="position:sticky;left:0;background:#f8f9fa;font-weight:bold;">${d}</td><td style="position:sticky;left:35px;background:#f8f9fa;">${count}</td>`;
        
        items.forEach(item => {
            let open = runningStock[item.id];
            let income = (d===1) ? monthlyIncome[item.id] : 0;
            let avail = open + income;
            
            let morn=0, after=0;
            if(item.id==='wheat') { if([1,3,4,5,6].includes(day)) morn=0.030*count; if([1,2,5].includes(day)) after=0.050*count; }
            if(item.id==='rice') { if(day===2) morn=0.030*count; if([3,4,6].includes(day)) after=0.050*count; }
            if(item.id==='oil') { if([1,2,3,4,5,6].includes(day)) { morn=0.005*count; after=0.008*count; } }
            if(item.id==='chana' && [2,4,5].includes(day)) after=0.020*count;
            if(item.id==='dal' && [1,3].includes(day)) after=0.020*count;

            let totalUse = morn + after;
            let close = avail - totalUse;
            
            runningStock[item.id] = close;
            totals[item.id].morning += morn;
            totals[item.id].afternoon += after;
            totals[item.id].cons += totalUse;
            totals[item.id].closing = close;

            row += `<td>${open.toFixed(3)}</td><td>${income>0?income.toFixed(3):'-'}</td><td>${avail.toFixed(3)}</td><td>${morn>0?morn.toFixed(3):'-'}</td><td>${after>0?after.toFixed(3):'-'}</td><td style="background:#fff3e0; font-weight:bold;">${totalUse.toFixed(3)}</td><td style="background:#e8f5e9; font-weight:bold; color:#2e7d32;">${close.toFixed(3)}</td>`;
        });
        row += `</tr>`;
        
        if(!isDaily || (isDaily && new Date(document.getElementById('reportDate').value).getDate() === d)) {
            html += row;
        }
    }
    html += `</tbody>`;

    if(!isDaily) {
        html += `<tfoot>
                    <tr style="background:white; color:black; font-weight:bold; border-top:3px solid black; border-bottom:1px solid black;">
                        <td style="position:sticky; left:0; background:white; color:black; z-index:10;">-</td>
                        <td style="position:sticky; left:35px; background:white; color:black; z-index:10;">કુલ</td>`;
        
        items.forEach(i => {
            html += `
                <td style="background:white; color:black;">-</td>
                <td style="background:white; color:black;">${totals[i.id].income.toFixed(3)}</td>
                <td style="background:white; color:black;">-</td>
                <td style="background:white; color:black;">${totals[i.id].morning.toFixed(3)}</td>
                <td style="background:white; color:black;">${totals[i.id].afternoon.toFixed(3)}</td>
                <td style="background:#ffecb3; color:black;">${totals[i.id].cons.toFixed(3)}</td>
                <td style="background:#c8e6c9; color:black;">${totals[i.id].closing.toFixed(3)}</td>
            `;
        });
        html += `</tr></tfoot>`;
    }

    html += `</table></div>`;
    container.innerHTML = html;

    let sumHtml = `<tr><th>વસ્તુ</th><th>આવક</th><th>સવાર</th><th>બપોર</th><th>કુલ વપરાશ</th><th>બંધ સિલક</th></tr>`;
    items.forEach(i => {
        sumHtml += `<tr><td>${i.name}</td><td>${totals[i.id].income.toFixed(3)}</td><td>${totals[i.id].morning.toFixed(3)}</td><td>${totals[i.id].afternoon.toFixed(3)}</td><td style="color:red;font-weight:bold;">${totals[i.id].cons.toFixed(3)}</td><td style="color:green;font-weight:bold;">${totals[i.id].closing.toFixed(3)}</td></tr>`;
    });
    document.getElementById('reportSummaryTable').innerHTML = sumHtml;
    document.getElementById('reportSummaryContainer').style.display = 'block';
    openPreview();
}

function openPreview() {
    const reportHTML = document.getElementById('reportTableContainer').innerHTML;
    const summaryHTML = document.getElementById('reportSummaryContainer').innerHTML;
    if(!reportHTML || reportHTML.includes("બટન દબાવો")) { showToast("પહેલા રિપોર્ટ જનરેટ કરો!", "error"); return; }
    
    const content = `
        <div style="font-family:Arial; padding:10px; background:white;">
            <div class="preview-buttons">
                <button class="btn" style="background:#673AB7;" onclick="printPreview()">🖨️ પ્રિન્ટ</button>
                <button class="btn btn-success" onclick="downloadPDF()">📄 PDF</button>
                <button class="btn" style="background:#25D366;" onclick="shareOnWhatsApp()">📱 WhatsApp</button>
            </div>
            <h2 style="text-align:center;">આંગણવાડી સ્ટોક પત્રક</h2>
            ${reportHTML}
            <br>
            <h3 style="text-align:center;">માસિક સમરી</h3>
            <div style="overflow-x:auto;">
                <table class="wide-table">${document.getElementById('reportSummaryTable').innerHTML}</table>
            </div>
        </div>`;
    document.getElementById('previewContent').innerHTML = content;
    document.getElementById('previewModal').style.display = 'block';
}

function closePreview() { document.getElementById('previewModal').style.display = 'none'; }
function printPreview() { window.print(); }
function downloadPDF() {
    const el = document.getElementById('previewContent');
    showToast("PDF બની રહ્યું છે...", "success");
    html2canvas(el, { scale: 2 }).then(c => {
        const img = c.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        const w = doc.internal.pageSize.getWidth();
        const h = (c.height * w) / c.width;
        doc.addImage(img, 'PNG', 0, 0, w, h);
        doc.save('Report.pdf');
        showToast("PDF ડાઉનલોડ થયું!", "success");
    });
}
function shareOnWhatsApp() { window.open(`https://wa.me/?text=Report`, '_blank'); }

// 7. BILL
function calculateMasalaAmounts() {
    const m = document.getElementById('billMonthSelector').value || appState.currentMonth;
    const y = document.getElementById('billYearSelector').value || appState.currentYear;
    const benData = JSON.parse(localStorage.getItem(`beneficiaries_${y}_${m}`)) || {};
    let total = 0; for(let k in benData) total += benData[k];
    if(document.getElementById('masala1Amount')) document.getElementById('masala1Amount').innerText = (total*1).toFixed(2);
    if(document.getElementById('masala2Amount')) document.getElementById('masala2Amount').innerText = (total*1.6).toFixed(2);
    if(document.getElementById('masala3Amount')) document.getElementById('masala3Amount').innerText = (total*1.3).toFixed(2);
    if(document.getElementById('totalMasalaAmount')) document.getElementById('totalMasalaAmount').innerText = ((total*1)+(total*1.6)+(total*1.3)).toFixed(2);
}
function generateMasala130Certificate() { fillCert('130', 1.30); }
function generateMasala160Certificate() { fillCert('160', 1.60); }
function generateMasala100Certificate() { fillCert('100', 1.00); }
function fillCert(s, r) {
    const m = document.getElementById('billMonthSelector').value;
    const y = document.getElementById('billYearSelector').value;
    const benData = JSON.parse(localStorage.getItem(`beneficiaries_${y}_${m}`)) || {};
    let total = 0; for(let k in benData) total += benData[k];
    if(total===0) { showToast("કોઈ લાભાર્થી નથી!", "error"); return; }
    
    const setText = (id, val) => { const e=document.getElementById(id); if(e) e.innerText=val; };
    setText(`centerName${s}`, document.getElementById('centerName').value || appState.centerInfo.centerName);
    setText(`workerName${s}`, document.getElementById('workerName').value || appState.centerInfo.workerName);
    setText(`workerName${s}Sign`, document.getElementById('workerName').value || appState.centerInfo.workerName);
    setText(`supervisorName${s}`, document.getElementById('supervisorName').value);
    setText(`registerPage${s}`, document.getElementById('registerPage').value);
    setText(`certificateDate${s}`, document.getElementById('certificateDate').value);
    setText(`beneficiaries${s}`, total);
    setText(`submittedAmount${s}`, (total*r).toFixed(2));
    document.getElementById(`certificateModal${s}`).style.display = 'block';
}
function closeCertificate(id) { document.getElementById(id).style.display = 'none'; }

// 8. UTILS
function showToast(m,t) { const x=document.getElementById('toast'); x.textContent=m; x.className=`toast show ${t}`; setTimeout(()=>x.classList.remove('show'),3000); }
function loadCenterInfo() {
    const info = JSON.parse(localStorage.getItem('centerInfo'));
    if(info) {
        appState.centerInfo = info;
        if(document.getElementById('centerNameHome')) document.getElementById('centerNameHome').value = info.centerName;
        if(document.getElementById('workerNameHome')) document.getElementById('workerNameHome').value = info.workerName;
        if(document.getElementById('sejoHome')) document.getElementById('sejoHome').value = info.sejo;
        if(document.getElementById('centerCodeHome')) document.getElementById('centerCodeHome').value = info.centerCode;
    }
}
function saveCenterInfo() {
    appState.centerInfo.centerName = document.getElementById('centerNameHome').value;
    appState.centerInfo.workerName = document.getElementById('workerNameHome').value;
    appState.centerInfo.sejo = document.getElementById('sejoHome').value;
    appState.centerInfo.centerCode = document.getElementById('centerCodeHome').value;
    localStorage.setItem('centerInfo', JSON.stringify(appState.centerInfo));
    showToast("સેવ થયું","success");
}

// AGE CALCULATOR (RESTORED)
function calculateAge() {
    const birthDate = new Date(document.getElementById('birthDate').value);
    const currentDate = new Date(document.getElementById('currentDate').value);
    
    if (isNaN(birthDate)) {
        showToast("જન્મ તારીખ નાખો", "error");
        return;
    }

    let years = currentDate.getFullYear() - birthDate.getFullYear();
    let months = currentDate.getMonth() - birthDate.getMonth();
    let days = currentDate.getDate() - birthDate.getDate();

    if (days < 0) {
        months--;
        days += new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    document.getElementById('ageResult').innerText = `${years} વર્ષ, ${months} મહિના, ${days} દિવસ`;
}

function calculateBMI(){ 
    // Logic Placeholder if needed
}
function appendToDisplay(v) { document.getElementById('calcDisplay').innerText += v; }
function clearCalculator() { document.getElementById('calcDisplay').innerText = '0'; }
function deleteLast() { let d=document.getElementById('calcDisplay'); d.innerText=d.innerText.slice(0,-1)||'0'; }
function calculateResult() { try{ document.getElementById('calcDisplay').innerText=eval(document.getElementById('calcDisplay').innerText); }catch{ document.getElementById('calcDisplay').innerText='Error'; } }
