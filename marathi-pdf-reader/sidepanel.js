// ===== Marathi PDF Reader - Compact Teleprompter + Selection Detection =====

// --- State ---
let allSentences = [];
let currentSentenceIdx = 0;
let isPlaying = false;
let isPaused = false;
let speechRate = 1.0;
let selectedVoice = null;
let availableVoices = [];
let totalPages = 0;

const synth = window.speechSynthesis;

// --- DOM ---
const noPdfSection = document.getElementById('noPdfSection');
const noPdfNote = document.getElementById('noPdfNote');
const loadingSection = document.getElementById('loadingSection');
const loadingText = document.getElementById('loadingText');
const pdfInfo = document.getElementById('pdfInfo');
const pdfName = document.getElementById('pdfName');
const pdfPages = document.getElementById('pdfPages');
const pageJumpInput = document.getElementById('pageJumpInput');
const btnPageGo = document.getElementById('btnPageGo');
const selectionBar = document.getElementById('selectionBar');
const btnReadSelection = document.getElementById('btnReadSelection');
const nowReading = document.getElementById('nowReading');
const telePrev = document.getElementById('telePrev');
const teleCurrent = document.getElementById('teleCurrent');
const teleNext = document.getElementById('teleNext');
const pageIndicator = document.getElementById('pageIndicator');
const sentenceIndicator = document.getElementById('sentenceIndicator');
const waveform = document.getElementById('waveform');
const playerControls = document.getElementById('playerControls');
const progressFill = document.getElementById('progressFill');
const progressCurrent = document.getElementById('progressCurrent');
const progressTotal = document.getElementById('progressTotal');
const progressBar = document.getElementById('progressBar');
const btnPlay = document.getElementById('btnPlay');
const iconPlay = document.getElementById('iconPlay');
const iconPause = document.getElementById('iconPause');
const btnStop = document.getElementById('btnStop');
const btnSkipBack = document.getElementById('btnSkipBack');
const btnSkipForward = document.getElementById('btnSkipForward');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const voiceSelect = document.getElementById('voiceSelect');
const statusText = document.getElementById('statusText');
const btnRefresh = document.getElementById('btnRefresh');

// --- PDF.js ---
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

// ===== VOICES =====
function loadVoices() {
    availableVoices = synth.getVoices();
    const relevant = availableVoices.filter(v =>
        v.lang.startsWith('mr') || v.lang.startsWith('hi') ||
        v.lang.includes('IN') || v.name.toLowerCase().includes('marathi') ||
        v.name.toLowerCase().includes('hindi')
    );

    voiceSelect.innerHTML = '';
    const list = relevant.length > 0 ? relevant : availableVoices;
    list.forEach(voice => {
        const idx = availableVoices.indexOf(voice);
        const opt = document.createElement('option');
        opt.value = idx;
        const isMarathi = voice.lang.startsWith('mr');
        opt.textContent = `${isMarathi ? '⭐ ' : ''}${voice.name} (${voice.lang})`;
        if (isMarathi && !selectedVoice) { opt.selected = true; selectedVoice = voice; }
        voiceSelect.appendChild(opt);
    });

    if (!selectedVoice && list.length > 0) {
        selectedVoice = list[0];
        voiceSelect.value = availableVoices.indexOf(list[0]);
    }
}

loadVoices();
if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;

// ===== AUTO-DETECT =====
detectPdf();

btnRefresh.addEventListener('click', () => {
    stopReading();
    allSentences = [];
    totalPages = 0;
    detectPdf();
});

async function detectPdf() {
    showState('loading');
    loadingText.textContent = 'PDF शोधत आहे...';
    setStatus('PDF शोधत आहे...', '');

    try {
        const tab = await sendMsg({ type: 'GET_ACTIVE_TAB' });
        if (!tab || !tab.url) { showState('nopdf'); return; }

        const url = tab.url;
        if (!url.toLowerCase().match(/\.pdf($|\?|#)/i)) {
            showState('nopdf');
            noPdfNote.textContent = '';
            setStatus('सध्याच्या टॅबमध्ये PDF नाही', '');
            return;
        }

        loadingText.textContent = 'PDF लोड होत आहे...';

        let arrayBuffer;
        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            arrayBuffer = await resp.arrayBuffer();
        } catch (fetchErr) {
            console.log('Direct fetch failed, trying content script...', fetchErr);
            const result = await sendMsg({ type: 'FETCH_PDF_VIA_CONTENT' });
            if (result && result.success) {
                const binary = atob(result.data);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                arrayBuffer = bytes.buffer;
            } else {
                if (url.startsWith('file://')) {
                    showState('nopdf');
                    noPdfNote.textContent = 'file:// URL साठी:\nchrome://extensions → Details → "Allow access to file URLs" सक्षम करा';
                    setStatus('File access आवश्यक', 'error');
                    return;
                }
                throw new Error(result?.error || 'Failed');
            }
        }

        await parsePdf(arrayBuffer, url);
    } catch (err) {
        console.error(err);
        showState('nopdf');
        noPdfNote.textContent = err.message;
        setStatus('PDF लोड करता आले नाही', 'error');
    }
}

// ===== PARSE =====
async function parsePdf(arrayBuffer, url) {
    loadingText.textContent = 'PDF वाचत आहे...';
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    totalPages = pdf.numPages;
    allSentences = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        loadingText.textContent = `पान ${i} / ${pdf.numPages} वाचत आहे...`;
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str).join(' ');
        splitSentences(text).forEach(s => allSentences.push({ text: s, pageNum: i }));
    }

    if (allSentences.length === 0) {
        showState('nopdf');
        noPdfNote.textContent = 'मजकूर सापडला नाही (स्कॅन केलेले PDF?)';
        setStatus('मजकूर सापडला नाही', 'error');
        return;
    }

    const filename = decodeURIComponent(url.split('/').pop().split('?')[0] || 'PDF');
    pdfName.textContent = filename;
    pdfPages.textContent = `${totalPages} पाने • ${allSentences.length} वाक्ये`;
    pageJumpInput.max = totalPages;

    showState('loaded');
    updateTeleprompter();
    updateProgress();
    setStatus('तयार! PDF मध्ये मजकूर निवडा किंवा ▶ दाबा', 'success');
}

function splitSentences(text) {
    return text.split(/[।\.!\?\;\n]+/).map(s => s.trim()).filter(s => s.length > 2);
}

// ===== UI STATE =====
function showState(state) {
    noPdfSection.style.display = state === 'nopdf' ? 'flex' : 'none';
    loadingSection.style.display = state === 'loading' ? 'flex' : 'none';
    pdfInfo.style.display = state === 'loaded' ? 'flex' : 'none';
    selectionBar.style.display = state === 'loaded' ? 'block' : 'none';
    nowReading.style.display = state === 'loaded' ? 'flex' : 'none';
    playerControls.style.display = state === 'loaded' ? 'block' : 'none';
    if (state !== 'loaded') waveform.style.display = 'none';
}

// ===== TELEPROMPTER =====
function updateTeleprompter() {
    if (!allSentences.length) return;

    const prev = currentSentenceIdx > 0 ? allSentences[currentSentenceIdx - 1].text + '।' : '';
    const curr = allSentences[currentSentenceIdx].text + '।';
    const next = currentSentenceIdx < allSentences.length - 1 ? allSentences[currentSentenceIdx + 1].text + '।' : '';

    telePrev.textContent = prev;
    teleCurrent.textContent = curr;
    teleNext.textContent = next;

    teleCurrent.classList.toggle('speaking', isPlaying && !isPaused);

    const pg = allSentences[currentSentenceIdx].pageNum;
    pageIndicator.textContent = `पान ${pg} / ${totalPages}`;
    sentenceIndicator.textContent = `${currentSentenceIdx + 1} / ${allSentences.length}`;
    pageJumpInput.value = pg;
}

// ===== SELECTION DETECTION =====
btnReadSelection.addEventListener('click', async () => {
    setStatus('PDF मधील निवड शोधत आहे...', '');

    try {
        const result = await sendMsg({ type: 'GET_SELECTION_FROM_TAB' });
        const selText = result?.text?.trim();

        if (!selText || selText.length < 3) {
            setStatus('⚠️ PDF मध्ये मजकूर निवडा प्रथम (Select text in PDF first)', 'error');
            return;
        }

        // Find the best matching sentence
        const lowerSel = selText.toLowerCase();
        let bestIdx = -1;
        let bestScore = 0;

        for (let i = 0; i < allSentences.length; i++) {
            const s = allSentences[i].text.toLowerCase();
            // Check if the sentence contains the selection or vice versa
            if (s.includes(lowerSel) || lowerSel.includes(s)) {
                const score = Math.min(s.length, lowerSel.length) / Math.max(s.length, lowerSel.length);
                if (score > bestScore) { bestScore = score; bestIdx = i; }
            }
        }

        // Also try partial word matching
        if (bestIdx === -1) {
            const selWords = lowerSel.split(/\s+/).filter(w => w.length > 2);
            for (let i = 0; i < allSentences.length; i++) {
                const s = allSentences[i].text.toLowerCase();
                let matches = 0;
                for (const w of selWords) {
                    if (s.includes(w)) matches++;
                }
                const score = selWords.length > 0 ? matches / selWords.length : 0;
                if (score > bestScore) { bestScore = score; bestIdx = i; }
            }
        }

        if (bestIdx >= 0 && bestScore > 0.3) {
            const wasPlaying = isPlaying && !isPaused;
            if (isPlaying) synth.cancel();

            currentSentenceIdx = bestIdx;
            updateTeleprompter();
            updateProgress();

            if (wasPlaying) speakCurrent();

            const pg = allSentences[bestIdx].pageNum;
            setStatus(`✓ पान ${pg} वरील वाक्य सापडले!`, 'success');
        } else {
            setStatus('⚠️ निवडलेला मजकूर PDF मध्ये सापडला नाही', 'error');
        }
    } catch (err) {
        console.error(err);
        setStatus('निवड वाचता आली नाही: ' + err.message, 'error');
    }
});

// ===== PAGE JUMP =====
btnPageGo.addEventListener('click', jumpToPage);
pageJumpInput.addEventListener('keydown', e => { if (e.key === 'Enter') jumpToPage(); });

function jumpToPage() {
    const page = parseInt(pageJumpInput.value);
    if (isNaN(page) || page < 1 || page > totalPages) return;
    const idx = allSentences.findIndex(s => s.pageNum === page);
    if (idx === -1) return;

    const wasPlaying = isPlaying && !isPaused;
    if (isPlaying) synth.cancel();
    currentSentenceIdx = idx;
    updateTeleprompter();
    updateProgress();
    if (wasPlaying) speakCurrent();
}

// ===== TTS =====
function speakCurrent() {
    if (currentSentenceIdx >= allSentences.length) {
        stopReading();
        setStatus('वाचन पूर्ण! 🎉', 'success');
        return;
    }

    const utt = new SpeechSynthesisUtterance(allSentences[currentSentenceIdx].text);
    utt.lang = 'mr-IN';
    utt.rate = speechRate;
    utt.pitch = 1.0;
    if (selectedVoice) utt.voice = selectedVoice;

    utt.onend = () => {
        if (isPlaying && !isPaused) {
            currentSentenceIdx++;
            updateTeleprompter();
            updateProgress();
            speakCurrent();
        }
    };

    utt.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') console.error('TTS error:', e.error);
    };

    updateTeleprompter();
    synth.speak(utt);
}

// Chrome bug: speech stops after ~15s
let keepAlive = null;
function startKeepAlive() {
    stopKeepAlive();
    keepAlive = setInterval(() => {
        if (synth.speaking && !synth.paused) { synth.pause(); synth.resume(); }
    }, 10000);
}
function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }

// ===== CONTROLS =====
btnPlay.addEventListener('click', () => {
    if (!allSentences.length) return;

    if (!isPlaying) {
        isPlaying = true; isPaused = false;
        iconPlay.style.display = 'none'; iconPause.style.display = 'block';
        waveform.style.display = 'flex'; waveform.classList.remove('paused');
        startKeepAlive(); speakCurrent();
        setStatus('वाचन सुरू आहे...', 'success');
    } else if (isPaused) {
        isPaused = false;
        iconPlay.style.display = 'none'; iconPause.style.display = 'block';
        waveform.classList.remove('paused');
        synth.resume(); startKeepAlive();
        setStatus('वाचन सुरू आहे...', 'success');
    } else {
        isPaused = true;
        iconPlay.style.display = 'block'; iconPause.style.display = 'none';
        waveform.classList.add('paused');
        synth.pause(); stopKeepAlive();
        setStatus('थांबवले', '');
    }
    updateTeleprompter();
});

btnStop.addEventListener('click', stopReading);

function stopReading() {
    isPlaying = false; isPaused = false;
    synth.cancel(); stopKeepAlive();
    currentSentenceIdx = 0;
    iconPlay.style.display = 'block'; iconPause.style.display = 'none';
    waveform.style.display = 'none';
    updateTeleprompter();
    updateProgress();
    setStatus('तयार! ▶ दाबा किंवा मजकूर निवडा', 'success');
}

btnSkipBack.addEventListener('click', () => {
    if (!allSentences.length) return;
    const skip = Math.max(1, Math.round(5 / speechRate));
    currentSentenceIdx = Math.max(0, currentSentenceIdx - skip);
    if (isPlaying && !isPaused) { synth.cancel(); speakCurrent(); }
    updateTeleprompter(); updateProgress();
});

btnSkipForward.addEventListener('click', () => {
    if (!allSentences.length) return;
    const skip = Math.max(1, Math.round(5 / speechRate));
    currentSentenceIdx = Math.min(allSentences.length - 1, currentSentenceIdx + skip);
    if (isPlaying && !isPaused) { synth.cancel(); speakCurrent(); }
    updateTeleprompter(); updateProgress();
});

speedSlider.addEventListener('input', e => {
    speechRate = parseFloat(e.target.value);
    speedValue.textContent = speechRate.toFixed(1) + 'x';
    if (isPlaying && !isPaused) { synth.cancel(); speakCurrent(); }
});

voiceSelect.addEventListener('change', e => {
    const idx = parseInt(e.target.value);
    if (!isNaN(idx) && availableVoices[idx]) {
        selectedVoice = availableVoices[idx];
        if (isPlaying && !isPaused) { synth.cancel(); speakCurrent(); }
    }
});

progressBar.addEventListener('click', e => {
    if (!allSentences.length) return;
    const rect = progressBar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    currentSentenceIdx = Math.min(Math.floor(ratio * allSentences.length), allSentences.length - 1);
    if (isPlaying && !isPaused) { synth.cancel(); speakCurrent(); }
    updateTeleprompter(); updateProgress();
});

// ===== PROGRESS =====
function updateProgress() {
    if (!allSentences.length) {
        progressFill.style.width = '0%';
        progressCurrent.textContent = '0:00';
        progressTotal.textContent = '0:00';
        return;
    }
    progressFill.style.width = (currentSentenceIdx / allSentences.length * 100) + '%';
    const avg = 3 / speechRate;
    progressCurrent.textContent = fmtTime(Math.round(currentSentenceIdx * avg));
    progressTotal.textContent = fmtTime(Math.round(allSentences.length * avg));
}

function fmtTime(s) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// ===== STATUS =====
function setStatus(msg, type) {
    statusText.textContent = msg;
    statusText.className = 'status-text' + (type ? ' ' + type : '');
}

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (!allSentences.length) return;
    switch (e.code) {
        case 'Space': e.preventDefault(); btnPlay.click(); break;
        case 'ArrowLeft': e.preventDefault(); btnSkipBack.click(); break;
        case 'ArrowRight': e.preventDefault(); btnSkipForward.click(); break;
        case 'ArrowUp':
            e.preventDefault();
            speedSlider.value = Math.min(2, parseFloat(speedSlider.value) + 0.1).toFixed(1);
            speedSlider.dispatchEvent(new Event('input')); break;
        case 'ArrowDown':
            e.preventDefault();
            speedSlider.value = Math.max(0.5, parseFloat(speedSlider.value) - 0.1).toFixed(1);
            speedSlider.dispatchEvent(new Event('input')); break;
        case 'Escape': btnStop.click(); break;
    }
});

// ===== MESSAGING =====
function sendMsg(msg) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage(msg, resp => {
            resolve(chrome.runtime.lastError ? null : resp);
        });
    });
}
