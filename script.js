// ==========================================
// 1. AUTH & INIT
// ==========================================
const CORRECT_PASSWORD = "Dev123";
// ગ્લોબલ વેરિયેબલ (ફાઈલ સાચવવા માટે)
let globalFileForShare = null;

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
            speak("જય શ્રી કૃષ્ણ.");
        }
        if (e.target.closest('.assistant-close')) {
            document.getElementById('aiAssistant').classList.remove('active');
            if('speechSynthesis' in window) window.speechSynthesis.cancel();
        }
    });

    const btn = document.createElement('button');
    btn.innerHTML = '<span class="material-icons">mic</span>';
    btn.style = "border:none; background:none; color:#FF6B6B; cursor:pointer; padding: 0 10px;";
    btn.onclick = toggleChatVoice; 
    const inputArea = document.querySelector('.assistant-input');
    if(inputArea) inputArea.prepend(btn);
}

function toggleChatVoice() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("તમારા બ્રાઉઝરમાં માઈક સપોર્ટ નથી."); return;
    }
    const SpeechRecognition = window.webkitSpeechRecognition;
    const r = new SpeechRecognition();
    r.lang = 'gu-IN';
    r.continuous = false; 
    
    r.onstart = () => { document.getElementById('assistantInput').placeholder = "સાંભળી રહ્યો છું..."; };
    r.onend = () => { document.getElementById('assistantInput').placeholder = "લખો..."; };
    r.onresult = (e) => {
        const text = e.results[0][0].transcript;
        document.getElementById('assistantInput').value = text;
        sendMessage();
    };
    try { r.start(); } catch(err) { console.log(err); }
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
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'gu-IN';
        window.speechSynthesis.speak(u);
    }
}

function processSmartQuery(query) {
    const q = query.toLowerCase();
    let resp = "સમજાય તેવું બોલોને બેન...";
    let actionTaken = false;

    if (q.includes('રિપોર્ટ') && (q.includes('ખોલો') || q.includes('પેજ'))) { showPage('reportPage'); resp = "રિપોર્ટ પેજ ખોલ્યું."; actionTaken = true; } 
    else if (q.includes('બિલ') && (q.includes('ખોલો') || q.includes('પેજ'))) { showPage('billPage'); resp = "બિલ પેજ ખોલ્યું."; actionTaken = true; }
    else if (q.includes('સ્ટોક') && (q.includes('ખોલો') || q.includes('પેજ'))) { showPage('stockPage'); resp = "સ્ટોક પેજ ખોલ્યું."; actionTaken = true; }
    else if (q.includes('લાભાર્થી') && (q.includes('ખોલો') || q.includes('પેજ'))) { showPage('beneficiaryPage'); resp = "લાભાર્થી પેજ ખોલ્યું."; actionTaken = true; }
    else if (q.includes('હોમ') || q.includes('ઘરે')) { showPage('homePage'); resp = "હોમ પેજ ખોલ્યું."; actionTaken = true; }
    else if (q.includes('પ્રિન્ટ') || q.includes('print')) {
        if(document.getElementById('reportPage').classList.contains('active')) {
            openPreview(); setTimeout(printPreview, 500); resp = "રિપોર્ટ પ્રિન્ટ કરી રહ્યો છું...";
        } else { window.print(); resp = "પ્રિન્ટ કમાન્ડ આપ્યો."; }
        actionTaken = true;
    }

    if (!actionTaken) {
        resp = "માફ કરશો, હું આ સમજી શકી નથી."; 
    }
    
    addMessage(resp, 'assistant');
    speak(resp);
}

// 3. CALENDAR & STOCK
function changeMonth(offset) {
    let m = appState.currentMonth + offset; let y = appState.currentYear;
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
        const c = appState.beneficiaries[d] || 0;
        let s = new Date(appState.currentYear, appState.currentMonth, d).getDay()===0 ? "calendar-day holiday" : "calendar-day";
        if(c>0) s += " has-beneficiaries";
        html += `<div class="${s}" onclick="editBeneficiaryCount(${d})"><div>${d}</div><div style="font-size:0.8rem;">${c>0?c:'-'}</div></div>`;
    }
    html += '</div>'; container.innerHTML = html; updateTotalBeneficiaries();
}
function editBeneficiaryCount(d) {
    if(new Date(appState.currentYear, appState.currentMonth, d).getDay()===0) return showToast('રવિવારે રજા હોય!', 'error');
    const v = prompt(`તારીખ ${d} ના લાભાર્થી:`, appState.beneficiaries[d]||0);
    if(v!==null) { appState.beneficiaries[d]=parseInt(v)||0; localStorage.setItem(`beneficiaries_${appState.currentYear}_${appState.currentMonth}`, JSON.stringify(appState.beneficiaries)); loadCalendar(); }
}
function updateTotalBeneficiaries() { let t=0; for(let k in appState.beneficiaries) t+=appState.beneficiaries[k]; if(document.getElementById('totalCount')) document.getElementById('totalCount').innerText=t; }

// Stock Functions
function loadStockData() {
    const m=document.getElementById('stockMonthSelector').value, y=document.getElementById('stockYearSelector').value;
    appState.stock = JSON.parse(localStorage.getItem(`stock_${y}_${m}`)) || {};
    ['wheat','rice','oil','chana','dal'].forEach(i => {
        if(document.getElementById(`${i}_open`)) document.getElementById(`${i}_open`).value = appState.stock[`${i}_open`] || '';
        if(document.getElementById(`${i}_income`)) document.getElementById(`${i}_income`).value = appState.stock[`${i}_income`] || '';
    });
    updateStockTotals();
}
function updateStockTotals() {
    let h=''; ['wheat','rice','oil','chana','dal'].forEach(i => {
        const o=parseFloat(document.getElementById(`${i}_open`)?.value)||0, inc=parseFloat(document.getElementById(`${i}_income`)?.value)||0;
        h += `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee;"><span>${i.toUpperCase()}:</span><b>${(o+inc).toFixed(3)}</b></div>`;
    });
    document.getElementById('stockTotals').innerHTML = h;
}
function saveStockData() {
    ['wheat','rice','oil','chana','dal'].forEach(i => {
        appState.stock[`${i}_open`]=document.getElementById(`${i}_open`).value; appState.stock[`${i}_income`]=document.getElementById(`${i}_income`).value;
    });
    localStorage.setItem(`stock_${document.getElementById('stockYearSelector').value}_${document.getElementById('stockMonthSelector').value}`, JSON.stringify(appState.stock));
}
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
function saveMatruMandalStockData() { 
    ['singdana','tal','gol'].forEach(i => {
        appState.matruMandalStock[`${i}_open`] = document.getElementById(`${i}_open`).value;
        appState.matruMandalStock[`${i}_income`] = document.getElementById(`${i}_income`).value;
    });
    const m = document.getElementById('matruMandalStockMonthSelector').value;
    const y = document.getElementById('matruMandalStockYearSelector').value;
    localStorage.setItem(`matruMandalStock_${y}_${m}`, JSON.stringify(appState.matruMandalStock));
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

// 4. REPORT
function generateReport(isDaily) {
    const container = document.getElementById('reportTableContainer');
    const m = parseInt(document.getElementById('reportMonthSelector').value);
    const y = parseInt(document.getElementById('reportYearSelector').value);
    const stockData = JSON.parse(localStorage.getItem(`stock_${y}_${m}`)) || {};
    const benData = JSON.parse(localStorage.getItem(`beneficiaries_${y}_${m}`)) || {};

    const items = [{id:'wheat',name:'ઘઉં'},{id:'rice',name:'ચોખા'},{id:'oil',name:'તેલ'},{id:'chana',name:'ચણા'},{id:'dal',name:'દાળ'}];
    let runningStock={}, monthlyIncome={}, totals={};
    items.forEach(i => {
        runningStock[i.id] = parseFloat(stockData[`${i.id}_open`])||0;
        monthlyIncome[i.id] = parseFloat(stockData[`${i.id}_income`])||0;
        totals[i.id] = {income:monthlyIncome[i.id], morning:0, afternoon:0, cons:0, closing:0};
    });

    let html = `<h3 style="text-align:center;">${gujaratiMonths[m]} ${y}</h3><div style="overflow-x:auto;"><table class="wide-table"><thead><tr><th rowspan="2" style="position:sticky;left:0;z-index:10;background:#2c3e50;color:white;">તારીખ</th><th rowspan="2" style="position:sticky;left:35px;z-index:10;background:#2c3e50;color:white;">લાભાર્થી</th>`;
    items.forEach(i => html+=`<th colspan="7" style="border-bottom:2px solid white;">${i.name}</th>`);
    html+=`</tr><tr>`; items.forEach(()=>html+=`<th>ઓપ</th><th>આવક</th><th>કુલ</th><th>સવાર</th><th>બપોર</th><th>કુલ વપરાશ</th><th>બંધ</th>`);
    html+=`</tr></thead><tbody>`;

    const days = new Date(y, m+1, 0).getDate();
    for(let d=1; d<=days; d++) {
        const date = new Date(y,m,d), day=date.getDay(), count=benData[d]||0;
        if(isDaily && new Date(document.getElementById('reportDate').value).getDate()!==d) continue;
        if(day===0) { 
            if(!isDaily || (isDaily && new Date(document.getElementById('reportDate').value).getDate()===d))
                html+=`<tr style="background:#ffebee;"><td style="position:sticky;left:0;background:#ffebee;">${d}</td><td style="position:sticky;left:35px;background:#ffebee;">-</td><td colspan="35" style="text-align:center;color:red;">રવિવાર</td></tr>`;
            continue; 
        }
        
        let row = `<tr><td style="position:sticky;left:0;background:#f8f9fa;">${d}</td><td style="position:sticky;left:35px;background:#f8f9fa;">${count}</td>`;
        items.forEach(item => {
            let open=runningStock[item.id], income=(d===1)?monthlyIncome[item.id]:0, avail=open+income;
            let morn=0, after=0;
            if(item.id==='wheat') { if([1,3,4,5,6].includes(day)) morn=0.030*count; if([1,2,5].includes(day)) after=0.050*count; }
            if(item.id==='rice') { if(day===2) morn=0.030*count; if([3,4,6].includes(day)) after=0.050*count; }
            if(item.id==='oil') { if(day!==0) { morn=0.005*count; after=0.008*count; } }
            if(item.id==='chana' && [2,4,5].includes(day)) after=0.020*count;
            if(item.id==='dal' && [1,3].includes(day)) after=0.020*count;

            let totalUse=morn+after, close=avail-totalUse;
            runningStock[item.id]=close; totals[item.id].morning+=morn; totals[item.id].afternoon+=after; totals[item.id].cons+=totalUse; totals[item.id].closing=close;
            row+=`<td>${open.toFixed(3)}</td><td>${income>0?income.toFixed(3):'-'}</td><td>${avail.toFixed(3)}</td><td>${morn>0?morn.toFixed(3):'-'}</td><td>${after>0?after.toFixed(3):'-'}</td><td style="background:#fff3e0;">${totalUse.toFixed(3)}</td><td style="background:#e8f5e9;color:green;">${close.toFixed(3)}</td>`;
        });
        html+=row+`</tr>`;
    }
    html+=`</tbody></table></div>`;
    container.innerHTML=html;

    let sumHtml=`<tr><th>વસ્તુ</th><th>આવક</th><th>સવાર</th><th>બપોર</th><th>કુલ વપરાશ</th><th>બંધ સિલક</th></tr>`;
    items.forEach(i=>sumHtml+=`<tr><td>${i.name}</td><td>${totals[i.id].income.toFixed(3)}</td><td>${totals[i.id].morning.toFixed(3)}</td><td>${totals[i.id].afternoon.toFixed(3)}</td><td style="color:red;">${totals[i.id].cons.toFixed(3)}</td><td style="color:green;">${totals[i.id].closing.toFixed(3)}</td></tr>`);
    document.getElementById('reportSummaryTable').innerHTML=sumHtml;
    document.getElementById('reportSummaryContainer').style.display='block';
    openPreview();
}

function openPreview() {
    // RESET GLOBAL SHARE VAR (દર વખતે નવેસરથી શરૂ કરવા)
    globalFileForShare = null;
    
    const reportHTML = document.getElementById('reportTableContainer').innerHTML;
    if(!reportHTML || reportHTML.includes("બટન દબાવો")) { showToast("પહેલા રિપોર્ટ જનરેટ કરો!", "error"); return; }
    
    const content = `
        <div id="pdfPrintContent" style="font-family:Arial; padding:10px; background:white; width:100%;">
            <div class="preview-buttons" style="display:flex; gap:10px; justify-content:center; margin-bottom:15px;">
                <button class="btn" style="background:#673AB7; color:white;" onclick="window.print()">🖨️ Print</button>
                <button class="btn btn-success" onclick="handlePDFAction('download')">📄 PDF Download</button>
                <button id="btnShare" class="btn" style="background:#25D366; color:white;" onclick="handlePDFAction('share')">📱 WhatsApp</button>
            </div>
            <h2 style="text-align:center;">આંગણવાડી સ્ટોક પત્રક</h2>
            <div id="pdfReportTable">${reportHTML}</div>
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

// *** FINAL FIX: 2-STEP SHARING WITH SMOOTH FALLBACK (NO ERROR MSG) ***
async function handlePDFAction(action) {
    if(!window.jspdf || !window.html2canvas) { alert("Error: Libraries not loaded. Check Internet connection."); return; }

    const shareBtn = document.getElementById('btnShare');

    // === STEP 2: SHARE IF READY ===
    if(action === 'share' && globalFileForShare) {
        try {
            // Check if device supports sharing files
            if(navigator.canShare && navigator.canShare({ files: [globalFileForShare] })) {
                await navigator.share({
                    files: [globalFileForShare]
                    // removed title/text to avoid permission errors
                });
                
                // If successful
                globalFileForShare = null;
                if(shareBtn) {
                    shareBtn.innerHTML = '📱 WhatsApp';
                    shareBtn.style.background = '#25D366';
                }
            } else {
                // If canShare returns false, force error to trigger fallback
                throw new Error("Device does not support file sharing");
            }
        } catch(e) {
            // SILENT FALLBACK: Don't show scary error
            // Just inform user about download
            alert("તમારા મોબાઈલમાં ડાયરેક્ટ શેરિંગ સપોર્ટ નથી, તેથી PDF ડાઉનલોડ થઈ રહી છે. તમે 'Downloads' ફોલ્ડર માંથી તેને મોકલી શકો છો.");
            
            const url = URL.createObjectURL(globalFileForShare);
            const a = document.createElement('a');
            a.href = url;
            a.download = "Anganwadi_Report.pdf";
            a.click();
            URL.revokeObjectURL(url);
            
            globalFileForShare = null;
            if(shareBtn) {
                shareBtn.innerHTML = '📱 WhatsApp';
                shareBtn.style.background = '#25D366';
            }
        }
        return; 
    }

    // === STEP 1: GENERATE ===
    const element = document.getElementById('previewContent');
    const btnContainer = document.querySelector('.preview-buttons');
    const scrollableDiv = document.querySelector('#pdfReportTable > div'); 

    // Visual Feedback
    const originalText = shareBtn ? shareBtn.innerHTML : '';
    if(action === 'share' && shareBtn) {
        shareBtn.innerHTML = '⏳ બની રહ્યું છે...';
        showToast("PDF બની રહ્યું છે... કૃપા કરીને રાહ જુઓ", "success");
    } else {
        showToast("PDF ડાઉનલોડ થઈ રહ્યું છે...", "success");
    }

    const originalStyles = {
        overflow: element.style.overflow,
        height: element.style.height,
        width: element.style.width,
        divOverflow: scrollableDiv ? scrollableDiv.style.overflow : ''
    };

    if(btnContainer) btnContainer.style.display = 'none';

    // Force Wide (2500px)
    const table = document.querySelector('.wide-table');
    const requiredWidth = table ? Math.max(table.scrollWidth + 250, 2500) : 2500;

    element.style.overflow = 'visible';
    element.style.height = 'auto';
    element.style.width = requiredWidth + 'px';
    element.style.background = 'white';
    
    if(scrollableDiv) {
        scrollableDiv.style.overflow = 'visible';
        scrollableDiv.style.maxHeight = 'none';
    }

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            width: requiredWidth,
            windowWidth: requiredWidth,
            scrollY: -window.scrollY 
        });

        // Restore styles immediately
        element.style.overflow = originalStyles.overflow;
        element.style.height = originalStyles.height;
        element.style.width = originalStyles.width;
        if(scrollableDiv) scrollableDiv.style.overflow = originalStyles.divOverflow;
        if(btnContainer) btnContainer.style.display = 'flex';

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdfW = 297; 
        const pdfH = (canvas.height * pdfW) / canvas.width;
        const pdf = new jsPDF('l', 'mm', [pdfW, pdfH + 10]);
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

        const fileName = "Anganwadi_Report.pdf";

        if (action === 'share') {
            const pdfBlob = pdf.output('blob');
            // Create File Object HERE to be ready
            globalFileForShare = new File([pdfBlob], fileName, { type: "application/pdf" });
            
            // UPDATE BUTTON FOR STEP 2
            if(shareBtn) {
                shareBtn.innerHTML = '📤 હવે મોકલો (ક્લિક કરો)';
                shareBtn.style.background = '#e91e63'; 
                showToast("PDF તૈયાર છે! હવે 'મોકલો' બટન દબાવો.", "success");
            }
        } else {
            pdf.save(fileName);
            showToast("PDF ડાઉનલોડ થયું!", "success");
        }

    } catch (err) {
        element.style.overflow = originalStyles.overflow;
        element.style.height = originalStyles.height;
        element.style.width = originalStyles.width;
        if(scrollableDiv) scrollableDiv.style.overflow = originalStyles.divOverflow;
        if(btnContainer) btnContainer.style.display = 'flex';
        
        if(action === 'share' && shareBtn) shareBtn.innerHTML = originalText;
        console.error(err);
        alert("Error: " + err.message);
    }
}

// 7. BILL & UTILS (Existing functions)
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
function saveCenterInfo() { appState.centerInfo.centerName = document.getElementById('centerNameHome').value; appState.centerInfo.workerName = document.getElementById('workerNameHome').value; appState.centerInfo.sejo = document.getElementById('sejoHome').value; appState.centerInfo.centerCode = document.getElementById('centerCodeHome').value; localStorage.setItem('centerInfo', JSON.stringify(appState.centerInfo)); showToast("સેવ થયું","success"); }
function calculateAge() { 
    const birthDate = new Date(document.getElementById('birthDate').value);
    const currentDate = new Date(document.getElementById('currentDate').value);
    if (isNaN(birthDate)) { showToast("જન્મ તારીખ નાખો", "error"); return; }
    let years = currentDate.getFullYear() - birthDate.getFullYear();
    let months = currentDate.getMonth() - birthDate.getMonth();
    let days = currentDate.getDate() - birthDate.getDate();
    if (days < 0) { months--; days += new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    document.getElementById('ageResult').innerText = `${years} વર્ષ, ${months} મહિના, ${days} દિવસ`;
}
function appendToDisplay(v) { document.getElementById('calcDisplay').innerText += v; }
function clearCalculator() { document.getElementById('calcDisplay').innerText = '0'; }
function deleteLast() { let d=document.getElementById('calcDisplay'); d.innerText=d.innerText.slice(0,-1)||'0'; }
function calculateResult() { try{ document.getElementById('calcDisplay').innerText=eval(document.getElementById('calcDisplay').innerText); }catch{ document.getElementById('calcDisplay').innerText='Error'; } }
