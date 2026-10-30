'use strict';

/*  1. ALTERNADOR DE TEMA (Dark/Light) — preferência persistida */
const body = document.body;
const themeToggleBtn = document.getElementById('theme-toggle');

function applyTheme(isDark) {
    body.classList.toggle('dark-mode', isDark);
    body.classList.toggle('light-mode', !isDark);
    themeToggleBtn.setAttribute('aria-pressed', String(isDark));
}

try {
    applyTheme(localStorage.getItem('tema') === 'dark');
} catch (e) { /* localStorage indisponível: mantém o tema claro */ }

themeToggleBtn.addEventListener('click', () => {
    const isDark = !body.classList.contains('dark-mode');
    applyTheme(isDark);
    try { localStorage.setItem('tema', isDark ? 'dark' : 'light'); } catch (e) {}
});


/*   2. GESTOR DE TAREFAS
   Estrutura: [{ id: 1, text: "Exemplo", completed: false }]
   */
const STORAGE_KEY = 'minhasTarefas';
const todoInput = document.getElementById('todo-input');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');

function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        return saved.map((item, i) =>
            typeof item === 'string'
                ? { id: Date.now() + i, text: item, completed: false }
                : item
        );
    } catch (e) {
        return [];
    }
}

let tasks = loadTasks();

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function renderTasks() {
    todoList.innerHTML = '';

    if (tasks.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty-text';
        empty.textContent = 'Nenhuma tarefa ainda. Adicione a primeira acima.';
        todoList.appendChild(empty);
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'todo-item' + (task.completed ? ' completed' : '');

        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTask(task.id));

        const text = document.createElement('span');
        text.className = 'todo-text';
        text.textContent = task.text;

        label.append(checkbox, text);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn delete-btn';
        deleteBtn.textContent = 'Excluir';
        deleteBtn.setAttribute('aria-label', `Excluir tarefa: ${task.text}`);
        deleteBtn.addEventListener('click', () => removeTask(task.id));

        li.append(label, deleteBtn);
        todoList.appendChild(li);
    });
}

function addTask() {
    const text = todoInput.value.trim();
    if (text === '') return;
    tasks.push({ id: Date.now(), text, completed: false });
    saveTasks();
    todoInput.value = '';
    renderTasks();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) task.completed = !task.completed;
    saveTasks();
    renderTasks();
}

function removeTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

addTodoBtn.addEventListener('click', addTask);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
renderTasks();


/*3. CALCULADORA DE PRAZOS */
const deadlineForm = document.getElementById('deadline-form');
const deadlineResult = document.getElementById('deadline-result');

function addDays(startDate, quantity, type) {
    const result = new Date(startDate);

    if (type === 'corridos') {
        result.setDate(result.getDate() + quantity);
        return result;
    }

    let counted = 0;
    while (counted < quantity) {
        result.setDate(result.getDate() + 1);
        const weekday = result.getDay();
        if (weekday !== 0 && weekday !== 6) counted++;
    }
    return result;
}

function formatDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${date.getFullYear()}`;
}

function showDeadlineError(message) {
    deadlineResult.className = 'deadline-result error';
    deadlineResult.textContent = message;
}

deadlineForm.addEventListener('submit', event => {
    event.preventDefault();

    const title = document.getElementById('deadline-goal-input').value.trim();
    const dateValue = document.getElementById('start-date').value;
    const quantity = parseInt(document.getElementById('days-qty').value, 10);
    const type = document.getElementById('day-type').value;

    if (!title) return showDeadlineError('Informe o evento ou a meta deste prazo.');
    if (!dateValue) return showDeadlineError('Informe a data inicial.');
    if (Number.isNaN(quantity) || quantity < 0) return showDeadlineError('Informe uma quantidade de dias válida (0 ou mais).');

    const [year, month, day] = dateValue.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const finalDate = addDays(startDate, quantity, type);
    const weekday = finalDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    const typeLabel = type === 'uteis' ? 'dias úteis' : 'dias corridos';

    deadlineResult.className = 'deadline-result';
    deadlineResult.innerHTML = `
        <small>Prazo para</small>
        <span class="deadline-goal"></span>
        <small>Data final</small>
        <strong class="deadline-date"></strong>
        <small class="deadline-note"></small>`;
    deadlineResult.querySelector('.deadline-goal').textContent = title;
    deadlineResult.querySelector('.deadline-date').textContent = formatDate(finalDate);
    deadlineResult.querySelector('.deadline-note').textContent =
        `${weekday}, ${quantity} ${typeLabel} a partir de ${formatDate(startDate)}`;
});


/*  4. APIs (Clima, Cotações e Notícias)
 */

const PIXEL_COLORS = {
    Y: '#FFD23F', M: '#FFF1A8', W: '#FFFFFF', g: '#C9DDF2', D: '#8FA3B8',
    d: '#6F849A', B: '#3B8FE0', S: '#BFE3FF', N: '#1D4E89', K: 'var(--pixel-outline)'
};

const createCanvas = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));

function stamp(canvas, grid, x, y, remap = {}) {
    grid.forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch !== '.') canvas[y + r][x + c] = remap[ch] || ch;
    }));
}

function addOutline(canvas) {
    const h = canvas.length + 2, w = canvas[0].length + 2;
    const out = createCanvas(w, h);
    canvas.forEach((row, r) => row.forEach((ch, c) => { out[r + 1][c + 1] = ch; }));
    const filled = (r, c) => out[r] && out[r][c] && out[r][c] !== '.' && out[r][c] !== 'K';
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            if (out[r][c] === '.' && (filled(r - 1, c) || filled(r + 1, c) || filled(r, c - 1) || filled(r, c + 1))) {
                out[r][c] = 'K';
            }
        }
    }
    return out;
}

function canvasToSvg(canvas, cssClass, label) {
    const outlined = addOutline(canvas);
    let rects = '';
    outlined.forEach((row, y) => {
        let x = 0;
        while (x < row.length) {
            const ch = row[x];
            let run = 1;
            while (x + run < row.length && row[x + run] === ch) run++;
            if (ch !== '.') rects += `<rect x="${x}" y="${y}" width="${run}" height="1" style="fill:${PIXEL_COLORS[ch]}"/>`;
            x += run;
        }
    });
    return `<svg class="pixel ${cssClass}" viewBox="0 0 ${outlined[0].length} ${outlined.length}" role="img" aria-label="${label}">${rects}</svg>`;
}

/* ---------- A. Clima (Open-Meteo) ---------- */
const SUN = ['......YY......', '......YY......', '..Y...YY...Y..', '...Y.YYYY.Y...', '....YYYYYY....', '.YY.YYYYYY.YY.', '.YY.YYYYYY.YY.', '....YYYYYY....', '...Y.YYYY.Y...', '..Y...YY...Y..', '......YY......', '......YY......'];
const MOON_TOP = ['....MMMMMMM...', '..MMMMMM..MM..', '.MMMMM.....MM.', '.MMMM.......M.', 'MMMMM.........', 'MMMMM.........'];
const MOON = [...MOON_TOP, ...[...MOON_TOP].reverse()];
const SUN_SM = ['....Y....', '.Y..Y..Y.', '..YYYYY..', '..YYYYY..', 'Y.YYYYY.Y', '..YYYYY..', '..YYYYY..', '.Y..Y..Y.', '....Y....'];
const MOON_SM = ['..MMMM..', '.MMM..MM', 'MMM....M', 'MMM.....', 'MMM.....', 'MMM....M', '.MMM..MM', '..MMMM..'];
const CLOUD = ['......WWWW....', '....WWWWWWWW..', '..WWWWWWWWWWW.', '.WWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', '.ggggggggggggg'];
const BOLT = ['...YY', '..YY.', '.YYYY', '..YY.', '.Y...'];
const GRAY = { W: 'D', g: 'd' };

/**
 * Céu (sem precipitação): decidido pela COBERTURA DE NUVENS (%), não só pelo weather_code.
 * O código 3 ("encoberto") é muito "pessimista" e aparecia mesmo em dia de sol com nuvens.
 */
function skyFromCloudCover(cover, isDay) {
    if (cover == null) return { scene: 'partly', label: isDay ? 'Sol e nuvens' : 'Parcialmente nublado' };
    if (cover < 20) return { scene: 'clear',  label: isDay ? 'Ensolarado' : 'Céu limpo' };
    if (cover < 60) return { scene: 'partly', label: isDay ? 'Sol com poucas nuvens' : 'Poucas nuvens' };
    if (cover < 90) return { scene: 'partly', label: isDay ? 'Sol entre nuvens' : 'Parcialmente nublado' };
    return { scene: 'cloud', label: 'Nublado' };
}

/** Códigos da OMM para chuva/nevoeiro/tempestade; para o resto, usa a cobertura de nuvens. */
function classifyWeather({ code, isDay, cloud, precip = 0, recentRain = 0 }) {
    if (code === 45 || code === 48) return { scene: 'fog', label: 'Nevoeiro' };
    if (code >= 51 && code <= 57) return { scene: 'drizzle', label: 'Garoa' };
    if (code >= 61 && code <= 67) return { scene: 'rain', label: 'Chuva' };
    if (code >= 80 && code <= 86) return { scene: 'rain', label: 'Pancadas de chuva' };
    if (code >= 95 && code <= 99) return { scene: 'storm', label: 'Tempestade' };

    // Se a API mede chuva agora, mas o código não indicou chuva, confia na medição
    if (precip >= 2.5) return { scene: 'rain', label: 'Chuva' };
    if (precip > 0) return { scene: 'drizzle', label: 'Garoa' };

    // Códigos 0, 1, 2, 3 (e qualquer código desconhecido): céu definido pelas nuvens
    const sky = skyFromCloudCover(cloud, isDay);

    // Choveu nas últimas horas: não mostra sol
    if (recentRain > 0.1 && sky.scene !== 'clear') return { scene: 'cloud', label: 'Nublado, choveu há pouco' };
    return sky;
}

function buildWeatherIcon(scene, label, isDay) {
    const c = createCanvas(18, 13);
    switch (scene) {
        case 'clear': stamp(c, isDay ? SUN : MOON, 2, 0); break;
        case 'partly': stamp(c, isDay ? SUN_SM : MOON_SM, 0, 0); stamp(c, CLOUD, 4, 5); break;
        case 'cloud': stamp(c, CLOUD, 2, 3, GRAY); break;
        case 'fog': stamp(c, CLOUD, 2, 0, GRAY); for (let x = 1; x < 17; x++) { c[8][x] = 'D'; c[10][x] = 'D'; } break;
        case 'drizzle': stamp(c, CLOUD, 2, 0, GRAY); [5, 9, 13].forEach(x => { c[8][x] = 'B'; }); [7, 11].forEach(x => { c[10][x] = 'B'; }); break;
        case 'rain': stamp(c, CLOUD, 2, 0, GRAY); [4, 8, 12].forEach(x => { c[8][x] = 'B'; c[9][x] = 'B'; }); [6, 10, 14].forEach(x => { c[10][x] = 'B'; c[11][x] = 'B'; }); break;
        case 'storm': stamp(c, CLOUD, 2, 0, GRAY); stamp(c, BOLT, 7, 7); break;
    }
    return canvasToSvg(c, 'weather-pixel', label);
}

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-8.7612&longitude=-63.9039'
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m'
    + '&hourly=precipitation&past_hours=3&forecast_hours=1'
    + '&daily=precipitation_probability_max&forecast_days=1&timezone=America%2FPorto_Velho';

async function getWeatherOpenMeteo() {
    const response = await fetch(WEATHER_URL);
    if (!response.ok) throw new Error(response.status);
    const d = await response.json();
    const cur = d.current;
    return {
        temp: cur.temperature_2m, feels: cur.apparent_temperature, humidity: cur.relative_humidity_2m,
        wind: cur.wind_speed_10m, code: cur.weather_code, cloud: cur.cloud_cover, isDay: cur.is_day === 1,
        precip: cur.precipitation || 0,
        recentRain: ((d.hourly && d.hourly.precipitation) || []).reduce((a, b) => a + (b || 0), 0),
        rainChance: d.daily && d.daily.precipitation_probability_max[0],
        time: cur.time.split('T')[1]
    };
}

async function fetchWeather() {
    const container = document.getElementById('weather-container');
    try {
        const w = await getWeatherOpenMeteo();
        const { scene, label } = classifyWeather(w);
        const rain = w.rainChance != null ? `<div><dt>Chance de chuva hoje</dt><dd>${w.rainChance}%</dd></div>` : '';

        container.innerHTML = `
            <div class="weather">
                <div class="weather-stage ${w.isDay ? 'is-day' : 'is-night'}">${buildWeatherIcon(scene, label, w.isDay)}</div>
                <h3 class="weather-temp">${Math.round(w.temp)}°C</h3>
                <p class="weather-label">${label}</p>
                <dl class="weather-details">
                    <div><dt>Sensação</dt><dd>${Math.round(w.feels)}°C</dd></div>
                    <div><dt>Umidade</dt><dd>${w.humidity}%</dd></div>
                    <div><dt>Vento</dt><dd>${w.wind} km/h</dd></div>
                    ${rain}
                </dl>
                <p class="weather-place">Porto Velho, RO${w.time ? ' (atualizado às ' + w.time + ')' : ''}</p>
            </div>`;
    } catch (error) {
        container.innerHTML = '<p class="error-text">Erro ao carregar o clima.</p>';
    }
}

/* ---------- B. Cotações ---------- */
const COIN = ['....YYYY....', '..YYYYYYYY..', '.YYYYYYYYYY.', 'YYYYYYYYYYYY', 'YYYYYYYYYYYY', 'YYYYYYYYYYYY', 'YYYYYYYYYYYY', 'YYYYYYYYYYYY', 'YYYYYYYYYYYY', '.YYYYYYYYYY.', '..YYYYYYYY..', '....YYYY....'];
const GLYPHS = {
    usd: ['..NN..', '.NNNNN', 'NN.N..', '.NNN..', '..NNN.', '..N.NN', 'NNNNN.', '..NN..'],
    eur: ['.NNNN.', 'NN....', 'NNNN..', 'NNNN..', 'NN....', '.NNNN.'],
    btc: ['.N.N..', 'NNNNN.', 'NN..NN', 'NNNNN.', 'NNNNN.', 'NN..NN', 'NNNNN.', '.N.N..'],
    eth: ['..NN..', '.NNNN.', 'NNNNNN', '.NNNN.', '......', '.NNNN.', '..NN..', '......']
};

function coinIcon(type, label) {
    const c = createCanvas(12, 12);
    stamp(c, COIN, 0, 0);
    const glyph = GLYPHS[type];
    stamp(c, glyph, 3, Math.floor((12 - glyph.length) / 2));
    return canvasToSvg(c, 'quote-icon', label);
}

const QUOTES = [
    { key: 'USDBRL', name: 'Dólar (USD)',    glyph: 'usd', chart: 'FX_IDC:USDBRL' },
    { key: 'EURBRL', name: 'Euro (EUR)',     glyph: 'eur', chart: 'FX_IDC:EURBRL' },
    { key: 'BTCBRL', name: 'Bitcoin (BTC)',  glyph: 'btc', chart: 'BINANCE:BTCBRL' },
    { key: 'ETHBRL', name: 'Ethereum (ETH)', glyph: 'eth', chart: 'BINANCE:ETHBRL' }
];

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

async function fetchQuotes() {
    const container = document.getElementById('quotes-container');
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL');
        if (!response.ok) throw new Error(response.status);
        const data = await response.json();
        container.innerHTML = '';
        QUOTES.forEach(q => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quote-item';
            btn.innerHTML = `${coinIcon(q.glyph, q.name)}<span class="quote-name">${q.name}</span><span class="quote-value">${brl.format(parseFloat(data[q.key].ask))}</span>`;
            btn.addEventListener('click', () => showChart(q.chart, q.name));
            container.appendChild(btn);
        });
        const chartBox = document.createElement('div');
        chartBox.id = 'chart-display';
        chartBox.hidden = true;
        container.appendChild(chartBox);
    } catch (error) {
        container.innerHTML = '<p class="error-text">Erro ao carregar as cotações.</p>';
    }
}

function showChart(symbol, name) {
    const box = document.getElementById('chart-display');
    const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
    const src = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&theme=${theme}&style=2&timezone=America%2FSao_Paulo&locale=br`;
    box.hidden = false;
    box.innerHTML = `<div class="chart-header"><strong>Gráfico: ${name}</strong><button type="button" class="btn chart-close">Fechar</button></div><iframe class="chart-frame" src="${src}"></iframe>`;
    box.querySelector('.chart-close').addEventListener('click', () => { box.hidden = true; box.innerHTML = ''; });
}

/* ---------- C. Notícias com imagem ---------- */
const NEWS_FEEDS = [
    'https://g1.globo.com/rss/g1/',
    'https://news.google.com/rss/search?q=futebol+OR+politica+OR+famosos&hl=pt-BR&gl=BR&ceid=BR:pt-419'
];

const NEWS_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="88" height="66"><rect width="88" height="66" fill="#1D4E89"/><path d="M24 46l12-16 9 11 6-7 13 12z" fill="#F39C12"/></svg>');

function extractImage(item) {
    if (item.thumbnail) return item.thumbnail;
    if (item.enclosure && item.enclosure.link && /image|\.(jpe?g|png|webp)/i.test(item.enclosure.type + item.enclosure.link)) return item.enclosure.link;
    const html = (item.content || '') + (item.description || '');
    const img = new DOMParser().parseFromString(html, 'text/html').querySelector('img');
    return img ? img.getAttribute('src') : null;
}

async function fetchNewsItems() {
    // Parâmetro Anti-Cache adicionado para garantir atualizações em tempo real
    const noCache = new Date().getTime(); 
    
    for (const feed of NEWS_FEEDS) {
        try {
            const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}&_cb=${noCache}`);
            const data = await response.json();
            if (data.items && data.items.length) return data.items;
        } catch (e) {}
    }
    throw new Error('Sem notícias');
}

async function fetchNews() {
    const container = document.getElementById('news-container');
    try {
        const items = await fetchNewsItems();
        container.innerHTML = '';

        items.slice(0, 4).forEach(noticia => {
            const article = document.createElement('article');
            article.className = 'news-item';
            const img = document.createElement('img');
            img.className = 'news-thumb';
            img.src = extractImage(noticia) || NEWS_PLACEHOLDER;
            img.onerror = () => { img.onerror = null; img.src = NEWS_PLACEHOLDER; };
            const content = document.createElement('div');
            const title = document.createElement('h3');
            title.className = 'news-title';
            title.textContent = noticia.title;
            const link = document.createElement('a');
            link.className = 'news-link';
            link.href = noticia.link;
            link.target = '_blank';
            link.textContent = 'Leia a matéria';
            content.append(title, link);
            article.append(img, content);
            container.appendChild(article);
        });
    } catch (error) {
        container.innerHTML = '<p class="error-text">Erro ao carregar as notícias.</p>';
    }
}

/* ==========================================================
   5. INICIALIZAÇÃO E ATUALIZAÇÕES AUTOMÁTICAS
   ========================================================== */
fetchWeather();
fetchQuotes();
fetchNews();

// Temporizadores (em milissegundos)
setInterval(fetchWeather, 60 * 1000);       // Clima: a cada 1 minuto (a fonte só renova a cada ~15 min)
setInterval(fetchQuotes, 30 * 1000);        // Cotações: a cada 30 segundos
setInterval(fetchNews, 5 * 60 * 1000);      // Notícias: a cada 5 minutos

// Ao voltar para a aba, atualiza tudo na hora (abas em segundo plano ficam lentas)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        fetchWeather();
        fetchQuotes();
        fetchNews();
    }
});
