let currentViewDate = new Date();
const calendarEl = document.getElementById('calendar');
const monthDisplay = document.getElementById('current-month-display');
const modalOverlay = document.getElementById('modal-overlay');
const noteInput = document.getElementById('note-input');
const keywordSearch = document.getElementById('keyword-search');
const resetBtn = document.getElementById('reset-search');
const emojiTrigger = document.getElementById('emoji-search-trigger');
const emojiDropdown = document.getElementById('emoji-dropdown');
const searchResults = document.getElementById('search-results');

let selectedDateKey = "";
let currentMood = 0;
let selectedTags = [];
let highlightedDates = []; // 現在ハイライトされている日付リスト

const getDiaryData = () => JSON.parse(localStorage.getItem('dailyEmojiData')) || {};

// カレンダー描画
function renderCalendar() {
    calendarEl.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    monthDisplay.innerText = `${year}年${month + 1}月`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data = getDiaryData();

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        calendarEl.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayData = data[dateStr];
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.dataset.date = dateStr; // 検索用

        // ハイライト状態の復元
        if (highlightedDates.includes(dateStr)) {
            cell.classList.add('highlight');
        }

        cell.innerHTML = `
            <span class="date-num">${day}</span>
            <span class="day-emoji">${dayData ? getMoodEmoji(dayData.mood) : ''}</span>
        `;
        cell.onclick = () => openEditor(dateStr);
        calendarEl.appendChild(cell);
    }
}

function getMoodEmoji(val) {
    return ['', '😞', '😐', '🙂', '😊', '🤩'][val] || '';
}

// 検索結果に基づきカレンダーをハイライト
function applyHighlights(keys) {
    highlightedDates = keys;
    resetBtn.classList.remove('hidden');
    renderCalendar(); // 再描画してクラスを適用
}

// リセット機能
function resetSearch() {
    highlightedDates = [];
    keywordSearch.value = "";
    resetBtn.classList.add('hidden');
    searchResults.classList.add('hidden');
    renderCalendar();
}

resetBtn.onclick = resetSearch;

// キーワード検索
keywordSearch.oninput = (e) => {
    const query = e.target.value.trim();
    if (!query) { resetSearch(); return; }

    const data = getDiaryData();
    const filtered = Object.keys(data).filter(date => data[date].note.includes(query));
    showResults(filtered, data);
    applyHighlights(filtered);
};

// 絵文字検索
emojiTrigger.onclick = () => emojiDropdown.classList.toggle('hidden');

document.querySelectorAll('.search-emoji-item').forEach(item => {
    item.onclick = () => {
        const val = item.dataset.val || item.innerText;
        const data = getDiaryData();
        const filtered = Object.keys(data).filter(date => {
            const entry = data[date];
            return entry.mood == val || entry.tags.includes(val);
        });
        emojiDropdown.classList.add('hidden');
        showResults(filtered, data);
        applyHighlights(filtered);
    };
});

function showResults(keys, data) {
    keys.sort((a, b) => b.localeCompare(a));
    if (keys.length === 0) {
        searchResults.innerHTML = '<div class="result-item" style="color:#ccc;">見つかりませんでした</div>';
    } else {
        searchResults.innerHTML = keys.map(key => `
            <div class="result-item" onclick="openAndSearch('${key}')">
                <span class="res-date">${key}</span>
                <span class="res-mood">${getMoodEmoji(data[key].mood)}</span>
                <span class="res-note">${data[key].note || '(メモなし)'}</span>
            </div>
        `).join('');
    }
    searchResults.classList.remove('hidden');
}

// モーダル処理
function openEditor(dateStr) {
    selectedDateKey = dateStr;
    document.getElementById('selected-date-label').innerText = `${dateStr} の記録`;
    const data = getDiaryData()[dateStr] || { mood: 0, tags: [], note: "" };
    currentMood = data.mood;
    selectedTags = data.tags;
    noteInput.value = data.note;
    modalOverlay.classList.remove('hidden');
    updateFormUI();
}

window.openAndSearch = (dateStr) => {
    searchResults.classList.add('hidden');
    openEditor(dateStr);
};

document.getElementById('save-btn').onclick = () => {
    if (currentMood == 0) {
        document.getElementById('mood-warning').classList.remove('hidden');
        return;
    }
    const data = getDiaryData();
    data[selectedDateKey] = { mood: currentMood, tags: selectedTags, note: noteInput.value };
    localStorage.setItem('dailyEmojiData', JSON.stringify(data));
    modalOverlay.classList.add('hidden');
    renderCalendar();
};

// UI更新
document.getElementById('prev-month').onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendar(); };
document.getElementById('next-month').onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendar(); };

document.querySelectorAll('.mood-item').forEach(btn => {
    btn.onclick = () => { currentMood = btn.dataset.mood; updateFormUI(); document.getElementById('mood-warning').classList.add('hidden'); };
});

document.querySelectorAll('.tag-item').forEach(btn => {
    btn.onclick = () => {
        const emoji = btn.querySelector('.emoji').innerText;
        selectedTags = selectedTags.includes(emoji) ? selectedTags.filter(t => t !== emoji) : [...selectedTags, emoji];
        updateFormUI();
    };
});

function updateFormUI() {
    document.querySelectorAll('.mood-item').forEach(btn => btn.classList.toggle('selected', btn.dataset.mood == currentMood));
    document.querySelectorAll('.tag-item').forEach(btn => {
        const emoji = btn.querySelector('.emoji').innerText;
        btn.classList.toggle('selected', selectedTags.includes(emoji));
    });
}

document.getElementById('close-btn').onclick = () => modalOverlay.classList.add('hidden');
document.addEventListener('click', (e) => {
    if (!emojiTrigger.contains(e.target) && !emojiDropdown.contains(e.target)) emojiDropdown.classList.add('hidden');
    if (!keywordSearch.contains(e.target) && !searchResults.contains(e.target) && !resetBtn.contains(e.target)) searchResults.classList.add('hidden');
});

// --- バックアップ（ダウンロード）機能 ---
const downloadBtn = document.getElementById('download-btn');

downloadBtn.onclick = () => {
    // 1. localStorageから現在のデータを取得
    const data = localStorage.getItem('dailyEmojiData');

    if (!data || data === '{}') {
        alert("保存するデータがまだありません。");
        return;
    }

    // 2. データを「Blob（データの塊）」に変換
    // JSON形式を見やすく整形（スペース2つ分）して格納します
    const blob = new Blob([data], { type: 'application/CSV' });

    // 3. ダウンロード用のURLを作成
    const url = URL.createObjectURL(blob);

    // 4. 一時的な <a> タグを作ってクリックさせる
    const a = document.createElement('a');
    a.href = url;

    // ファイル名に今日の日付を入れる（例: emoji_backup_2026-04-02.json）
    const today = new Date().toISOString().split('T')[0];
    a.download = `emoji_backup_${today}.CSV`;

    // ダウンロード実行
    a.click();

    // 5. 使い終わったURLを解放してメモリを節約
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

renderCalendar();
