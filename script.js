// --- 初期設定と状態管理 ---
let currentViewDate = new Date();
let selectedDateKey = "";
let currentMood = 0;
let selectedTags = [];
let highlightedDates = [];

const loarding = document.querySelector('#loading');
const getDiaryData = () => JSON.parse(localStorage.getItem('dailyEmojiData')) || {};
const getMoodEmoji = (val) => ['', '😞', '😐', '🙂', '😊', '🤩'][val] || '';

window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loading').classList.add('loaded');
    }, 2000); // 2秒後に消す
});

// DOM要素をすべて取得（エラー防止）
const elements = {
    calendar: document.getElementById('calendar'),
    year: document.getElementById('year-select'),
    month: document.getElementById('month-select'),
    modal: document.getElementById('modal-overlay'),
    note: document.getElementById('note-input'),
    detail: document.getElementById('day-detail'),
    detailDate: document.getElementById('detail-date'),
    detailEmoji: document.getElementById('detail-emoji-row'),
    detailNote: document.getElementById('detail-note'),
    detailEdit: document.getElementById('detail-edit-btn'),
    // 検索・ボタン関連
    keywordSearch: document.getElementById('keyword-search'),
    resetBtn: document.getElementById('reset-search'),
    emojiTrigger: document.getElementById('emoji-search-trigger'),
    emojiDropdown: document.getElementById('emoji-dropdown'),
    searchResults: document.getElementById('search-results')
};

// --- 初期化処理 ---
function init() {
    for (let y = 2024; y <= 2030; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = y;
        elements.year.appendChild(opt);
    }
    elements.year.value = currentViewDate.getFullYear();
    elements.month.value = currentViewDate.getMonth();
    renderCalendar();
}

// --- カレンダー描画 ---
function renderCalendar() {
    if (!elements.calendar) return;
    elements.calendar.innerHTML = "";

    const year = parseInt(elements.year.value);
    const month = parseInt(elements.month.value);
    currentViewDate = new Date(year, month, 1);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data = getDiaryData();

    // 日本の月曜日始まり等調整が必要ならここで（現在は日曜始まり想定）
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell empty';
        elements.calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayData = data[dateStr];

        const cell = document.createElement('div');
        cell.className = 'day-cell';

        const dayOfWeek = (firstDay + day - 1) % 7;
        if (dayOfWeek === 0) cell.classList.add('sun'); // 0は日曜
        if (dayOfWeek === 6) cell.classList.add('sat'); // 6は土曜

        // ハイライトと選択状態の付与
        if (highlightedDates.includes(dateStr)) cell.classList.add('highlight');
        if (selectedDateKey === dateStr) cell.classList.add('selected');

        cell.innerHTML = `
            <span class="date-num">${day}</span>
            <span class="day-emoji">${dayData ? getMoodEmoji(dayData.mood) : ''}</span>
        `;

        cell.onclick = () => selectDate(dateStr);
        elements.calendar.appendChild(cell);
    }
}

// --- 日付選択と詳細表示 ---
function selectDate(dateStr) {
    selectedDateKey = dateStr;
    const data = getDiaryData()[dateStr];

    if (data) {
        elements.detailDate.innerText = dateStr;
        const mood = getMoodEmoji(data.mood);
        const tags = data.tags.map(t => `<span>${t}</span>`).join(' ');
        elements.detailEmoji.innerHTML = `${mood} ${tags}`;
        elements.detailNote.innerText = data.note || "メモなし";
        elements.detailEdit.onclick = () => openEditor(dateStr);

        elements.detail.classList.remove('hidden');
        elements.detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        elements.detail.classList.add('hidden');
        openEditor(dateStr);
    }
    renderCalendar();
}

// --- モーダル操作 ---
function openEditor(dateStr) {
    selectedDateKey = dateStr;
    // 曜日の計算と表示
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const dateObj = new Date(dateStr.replace(/-/g, '/'));
    const dayName = days[dateObj.getDay()];
    document.getElementById('selected-date-label').innerText = `${dateStr} (${dayName})`;
    // データの読み込み
    const data = getDiaryData()[dateStr] || { mood: 0, tags: [], note: "" };
    currentMood = data.mood;
    selectedTags = [...data.tags];
    elements.note.value = data.note;
    // モーダルを表示
    elements.modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    //　　スクロール位置を一番上に戻す　
    const modalContent = elements.modal.querySelector('.editor-modal');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
    updateFormUI();
}

function updateFormUI() {
    document.querySelectorAll('.mood-item').forEach(btn =>
        btn.classList.toggle('selected', btn.dataset.mood == currentMood));
    document.querySelectorAll('.tag-item').forEach(btn => {
        const emoji = btn.querySelector('.emoji').innerText;
        btn.classList.toggle('selected', selectedTags.includes(emoji));
    });
}

// --- 検索システム ---

// ハイライト適用関数（新規作成）
function applyHighlights(keys) {
    highlightedDates = keys;
    if (keys.length > 0 || elements.keywordSearch.value.trim() !== "") {
        elements.resetBtn.classList.remove('hidden');
    } else {
        elements.resetBtn.classList.add('hidden');
    }
    renderCalendar();
}

// 検索結果をクリックした時の移動関数（新規作成）
function openAndSearch(dateStr) {
    const [y, m, d] = dateStr.split('-');
    elements.year.value = parseInt(y);
    elements.month.value = parseInt(m) - 1; // JSの月は0始まり

    elements.searchResults.classList.add('hidden');
    elements.emojiDropdown.classList.add('hidden');

    renderCalendar();
    selectDate(dateStr);
}

// 結果描画関数（HTMLの崩れを修正）
function showResults(keys, data) {
    keys.sort((a, b) => b.localeCompare(a));
    if (keys.length === 0) {
        elements.searchResults.innerHTML = '<div class="result-item" style="color:#ccc;">見つかりませんでした</div>';
    } else {
        elements.searchResults.innerHTML = keys.map(key => {
            const entry = data[key];
            const moodEmoji = getMoodEmoji(entry.mood);
            const noteText = entry.note || '(メモなし)';
            return `
                <div class="result-item" onclick="openAndSearch('${key}')">
                    <span class="res-date" style="font-weight:bold;">${key}</span>
                    <span class="res-mood">${moodEmoji}</span>
                    <span class="res-note" style="color:#666;">${noteText}</span>
                </div>
            `;
        }).join('');
    }
    elements.searchResults.classList.remove('hidden');
}

// 1. 絵文字検索
elements.emojiTrigger.onclick = () => {
    elements.emojiDropdown.classList.toggle('hidden');
    elements.searchResults.classList.add('hidden');
};

document.querySelectorAll('.search-emoji-item').forEach(item => {
    item.onclick = () => {
        const val = item.dataset.val || item.innerText;
        const data = getDiaryData();
        const filtered = Object.keys(data).filter(date => {
            const entry = data[date];
            return entry.mood == val || entry.tags.includes(val);
        });

        elements.emojiDropdown.classList.add('hidden');
        elements.keywordSearch.value = ""; // キーワード側をクリア
        showResults(filtered, data);
        applyHighlights(filtered);
    };
});

// 2. キーワード検索（新規追加）
elements.keywordSearch.addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();

    if (!term) {
        elements.searchResults.classList.add('hidden');
        applyHighlights([]);
        return;
    }

    const data = getDiaryData();
    const filtered = Object.keys(data).filter(date => {
        const note = data[date].note || "";
        return note.toLowerCase().includes(term);
    });

    elements.emojiDropdown.classList.add('hidden');
    showResults(filtered, data);
    applyHighlights(filtered);
});

// リセットボタン（新規追加）
elements.resetBtn.onclick = () => {
    elements.keywordSearch.value = "";
    elements.searchResults.classList.add('hidden');
    elements.emojiDropdown.classList.add('hidden');
    applyHighlights([]); // ハイライト解除
};

// 外側クリックで検索・ドロップダウンを閉じる処理（修正）
document.addEventListener('click', (e) => {
    if (!elements.emojiTrigger.contains(e.target) && !elements.emojiDropdown.contains(e.target)) {
        elements.emojiDropdown.classList.add('hidden');
    }
    if (!elements.keywordSearch.contains(e.target) && !elements.searchResults.contains(e.target) && !elements.resetBtn.contains(e.target)) {
        elements.searchResults.classList.add('hidden');
    }
});

// --- 各種ボタンイベント ---

// 保存
document.getElementById('save-btn').onclick = () => {
    if (currentMood == 0) {
        document.getElementById('mood-warning').classList.remove('hidden');
        return;
    }
    const data = getDiaryData();
    data[selectedDateKey] = { mood: currentMood, tags: selectedTags, note: elements.note.value };
    localStorage.setItem('dailyEmojiData', JSON.stringify(data));

    elements.modal.classList.add('hidden');
    document.body.classList.remove('modal-open');

    // 選択状態をリセット
    selectedDateKey = "";
    // 詳細エリアを隠す
    elements.detail.classList.add('hidden');
    renderCalendar();
};

// 閉じる
document.getElementById('close-btn').onclick = () => {
    elements.modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
};

// カレンダーの月移動
elements.year.onchange = renderCalendar;
elements.month.onchange = renderCalendar;
document.getElementById('prev-month').onclick = () => {
    let m = parseInt(elements.month.value) - 1;
    let y = parseInt(elements.year.value);
    if (m < 0) { m = 11; y--; }
    elements.year.value = y;
    elements.month.value = m;
    renderCalendar();
};
document.getElementById('next-month').onclick = () => {
    let m = parseInt(elements.month.value) + 1;
    let y = parseInt(elements.year.value);
    if (m > 11) { m = 0; y++; }
    elements.year.value = y;
    elements.month.value = m;
    renderCalendar();
};

// エディタ内の気分・タグ選択
document.querySelectorAll('.mood-item').forEach(btn => {
    btn.onclick = () => {
        currentMood = btn.dataset.mood;
        updateFormUI();
        document.getElementById('mood-warning').classList.add('hidden');
    };
});
document.querySelectorAll('.tag-item').forEach(btn => {
    btn.onclick = () => {
        const emoji = btn.querySelector('.emoji').innerText;
        selectedTags = selectedTags.includes(emoji) ? selectedTags.filter(t => t !== emoji) : [...selectedTags, emoji];
        updateFormUI();
    };
});

// CSVダウンロード
document.getElementById('download-btn').onclick = () => {
    const data = getDiaryData();
    if (Object.keys(data).length === 0) return alert("データがありません");
    let csv = "\uFEFF日付,気分,スタンプ,メモ\n";
    Object.keys(data).sort().forEach(k => {
        const row = data[k];
        const note = (row.note || "").replace(/"/g, '""').replace(/\n/g, ' ');
        csv += `${k},${getMoodEmoji(row.mood)},"${row.tags.join(' ')}","${note}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diary_backup.csv`;
    a.click();
};

// キーボード対策
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        if (!elements.modal.classList.contains('hidden')) {
            const offset = window.innerHeight - window.visualViewport.height;
            elements.modal.style.bottom = `${offset}px`;
        }
    });
}

// 実行
init();
