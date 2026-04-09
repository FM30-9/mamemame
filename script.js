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
// --- スマホキーボード対策：Visual Viewport API ---
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        if (!modalOverlay.classList.contains('hidden')) {
            // キーボードの高さを計算
            const offset = window.innerHeight - window.visualViewport.height;

            // モーダル全体をキーボード分だけ上に持ち上げる
            // 入力欄が隠れるのを防ぐ
            modalOverlay.style.bottom = `${offset}px`;

            // スムーズにスクロールして入力欄を見せる
            if (offset > 0) {
                document.activeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            modalOverlay.style.bottom = '0';
        }
    });
}

// --- モーダル開閉時の背景固定処理 ---
const originalOpenEditor = openEditor;
openEditor = (dateStr) => {
    originalOpenEditor(dateStr); // 元の処理を実行
    document.body.classList.add('modal-open'); // 背景スクロール禁止
    modalOverlay.style.bottom = '0'; // 位置リセット
};

const originalCloseBtnClick = document.getElementById('close-btn').onclick;
document.getElementById('close-btn').onclick = () => {
    if (originalCloseBtnClick) originalCloseBtnClick();
    document.body.classList.remove('modal-open'); // 背景スクロール解禁
};

// 保存時も背景固定を解除
const originalSaveBtnClick = document.getElementById('save-btn').onclick;
document.getElementById('save-btn').onclick = () => {
    if (originalSaveBtnClick()) { // 保存成功時（バリデーションを通った時）
        document.body.classList.remove('modal-open');
    }
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

const downloadBtn = document.getElementById('download-btn');

downloadBtn.onclick = () => {
    // 1. localStorageからデータを取得してオブジェクトに変換
    const rawData = localStorage.getItem('dailyEmojiData');
    if (!rawData || rawData === '{}') {
        alert("保存するデータがまだありません。");
        return;
    }
    const data = JSON.parse(rawData);

    // 2. CSVのヘッダーを作成
    let csvContent = "日付,気分,スタンプ,メモ\n";

    // 3. データを日付順に並び替えて、1行ずつCSV形式に変換
    Object.keys(data).sort().forEach(date => {
        const entry = data[date];

        // 数値の気分を絵文字に戻す（読みやすさ重視）
        const moodEmoji = getMoodEmoji(entry.mood);

        // スタンプ（配列）をスペース区切りの文字列にする
        const tags = entry.tags.join(' ');

        // メモ内の改行やダブルクォーテーションがCSVを壊さないように調整
        const safeNote = entry.note.replace(/"/g, '""').replace(/\n/g, ' ');

        // カンマ区切りで1行分を追加
        csvContent += `${date},${moodEmoji},"${tags}","${safeNote}"\n`;
    });

    // 4. 文字化け防止（BOM付きUTF-8）の設定
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });

    // 5. ダウンロード実行
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().split('T')[0];
    a.download = `毎日絵文字_backup_${today}.csv`;
    a.click();

    // 6. 後片付け
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

renderCalendar();

