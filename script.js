const allergenMap = {
    'latte': { icon: '🥛', label: 'Latte' },
    'glutine': { icon: '🌾', label: 'Glutine' },
    'uova': { icon: '🥚', label: 'Uova' },
    'guscio': { icon: '🥜', label: 'Frutta a guscio' },
    'sedano': { icon: '🌿', label: 'Sedano' }
};

// --- CONFIGURAZIONE GOOGLE SHEETS ---
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR0T1gIy-XDXJv_IYaOOOlgaJ4y7yidX2PF7RZjYp7BZEQZ4ttjHg-fbcFqLGyFVBzmeVT0W7zzJXyy/pub?output=csv'; 

let menuData = {};

function initDataFetch() {
    Papa.parse(SHEET_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            transformCsvToMenu(results.data);
            const firstBtn = document.querySelector('.tab-btn');
            if(firstBtn) showCategory('calde', firstBtn); 
        },
        error: function(err) {
            alert("Impossibile caricare il menù. Controlla la connessione.");
        }
    });
}

function transformCsvToMenu(csvData) {
    menuData = {}; 
    
    // Reset Banner
    const banner = document.getElementById('alert-banner');
    banner.style.display = 'none';

    const titles = {
        'calde': 'Caffetteria',
        'fredde': 'Bibite Fredde',
        'alcolici': 'Alcolici', 
        'food': 'Food & Snack',
        'dolci': 'Dolci & Dessert',
        'altro': 'Altro'
    };

    csvData.forEach(row => {
        if(!row.categoria || !row.nome) return;

        // --- LOGICA AVVISI (Nuova) ---
        // Se la categoria è AVVISO, mostra il banner e non aggiunge al menu
        if(row.categoria.toUpperCase().includes('AVVISO')) {
            if(row.disponibile && (row.disponibile.toLowerCase() === 'no' || row.disponibile.toLowerCase() === 'false')) return;
            
            const text = row.descrizione ? `${row.nome} - ${row.descrizione}` : row.nome;
            banner.innerHTML = `🔔 ${text}`;
            banner.style.display = 'block';
            return; // Salta il resto per questa riga
        }
        // -----------------------------

        if(row.disponibile && (row.disponibile.toLowerCase() === 'no' || row.disponibile.toLowerCase() === 'false')) return;

        let catKey = normalizeCategory(row.categoria);

        if(!menuData[catKey]) {
            menuData[catKey] = { 
                title: titles[catKey] || row.categoria,
                items: [] 
            };
        }

        let allergenesList = [];
        if(row.allergeni) {
            allergenesList = row.allergeni.split(',').map(s => s.trim().toLowerCase());
        }

        menuData[catKey].items.push({
            name: row.nome,
            price: parseFloat(row.prezzo.replace(',', '.')) || 0,
            description: row.descrizione || "",
            allergens: allergenesList,
            tag: row.tag || "",
            subcategory: row.categoria, 
            soldOut: (row.disponibile === 'soldout')
        });
    });
}

function normalizeCategory(catString) {
    const c = catString.toLowerCase();
    if(c.includes('caff') || c.includes('cald') || c.includes('tè') || c.includes('tisane')) return 'calde';
    if(c.includes('fredd') || c.includes('bibit') || c.includes('succh') || c.includes('acqu')) return 'fredde';
    if(c.includes('alcol') || c.includes('vin') || c.includes('birr') || c.includes('cocktail') || c.includes('amar') || c.includes('spritz') || c.includes('liquor') || c.includes('grap')) return 'alcolici';
    if(c.includes('cib') || c.includes('food') || c.includes('panin') || c.includes('snack') || c.includes('taglier') || c.includes('focacc')) return 'food';
    if(c.includes('dolc') || c.includes('dessert') || c.includes('gelat') || c.includes('tort')) return 'dolci';
    return 'altro';
}

// --- FUNZIONI UI ---
function openWifi() {
    const m = document.getElementById('wifi-modal');
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('active'), 10);
}
function closeWifi(e) {
    if(e.target === document.getElementById('wifi-modal') || e.target.classList.contains('close-modal')) {
        document.getElementById('wifi-modal').classList.remove('active');
        setTimeout(() => document.getElementById('wifi-modal').style.display = 'none', 300);
    }
}

/* Sostituisci il vecchio window.onscroll con questo: */

let lastScrollTop = 0;
const navContainer = document.querySelector('.sticky-nav-container');
const backToTopBtn = document.getElementById('back-to-top');

// --- NUOVA LOGICA SCROLL ---
 
const scrollDelta = 10; 

window.addEventListener('scroll', function() {
    let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    // 1. SEI IN LITE MODE? -> STOP. 
    // Non fare nulla. Lascia che il CSS tenga la barra fissa.
    if (document.body.classList.contains('lite-mode')) {
        navContainer.classList.remove('nav-hidden'); 
        return; 
    }

    // 2. MODALITÀ NORMALE -> Fai sparire/apparire la barra
    if (currentScroll < 0) return; // Ignora rimbalzi su iPhone

    if (Math.abs(lastScrollTop - currentScroll) > scrollDelta) {
        // Se scorri in BASSO (>100px) -> Nascondi
        if (currentScroll > lastScrollTop && currentScroll > 100) {
            navContainer.classList.add('nav-hidden');
        } 
        // Se scorri in ALTO -> Mostra
        else {
            navContainer.classList.remove('nav-hidden');
        }
        lastScrollTop = currentScroll;
    }

    // Gestione pulsante "Torna su"
    if (backToTopBtn) {
        backToTopBtn.style.display = currentScroll > 300 ? "flex" : "none";
    }
}, { passive: true });
    
function scrollToTop() { window.scrollTo({top: 0, behavior: 'smooth'}); }

function checkOpenStatus() {
    const now = new Date(); 
    const hour = now.getHours(); 
    const el = document.getElementById('status-indicator');
    const isOpen = hour >= 7 && hour < 24; 
    
    if(isOpen) { 
        el.innerHTML = '<span class="status-dot"></span> Aperto'; 
        el.classList.add('open'); 
        el.classList.remove('closed'); 
    } else { 
        el.innerHTML = '<span class="status-dot"></span> Chiuso'; 
        el.classList.add('closed'); 
        el.classList.remove('open'); 
    }
}

async function fetchWeather() {
    const weatherEl = document.getElementById('weather-indicator');
    const lat = 40.8106; 
    const lon = 15.1127;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    try {
        const response = await fetch(url); 
        const data = await response.json();
        const temp = Math.round(data.current_weather.temperature); 
        const code = data.current_weather.weathercode;
        
        let iconSvg = '';
        if(code <= 1) iconSvg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'; 
        else if (code <= 3) iconSvg = '<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>';
        else if (code >= 45 && code <= 48) iconSvg = '<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M5 16h14"/><path d="M5 20h14"/><path d="M5 8h14"/></svg>';
        else if (code >= 71 && code <= 77) { iconSvg = '<svg viewBox="0 0 24 24"><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line><path d="m20 16-4-4 4-4"></path><path d="m4 8 4 4-4 4"></path><path d="m16 4-4 4-4-4"></path><path d="m8 20 4-4 4 4"></path></svg>'; weatherEl.classList.add('snow'); }
        else if (code >= 95) iconSvg = '<svg viewBox="0 0 24 24"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline></svg>';
        else iconSvg = '<svg viewBox="0 0 24 24"><line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>';

        weatherEl.innerHTML = `${iconSvg} ${temp}°C`; 
        weatherEl.style.display = 'inline-flex'; 
    } catch (e) { console.log("Meteo non disponibile"); }
}

function toggleLiteMode() {
    const body = document.body; 
    const btn = document.getElementById('lite-switch');
    
    body.classList.toggle('lite-mode'); 
    
    const isLite = body.classList.contains('lite-mode');
    btn.innerHTML = isLite ? "🚀 Normal" : "⚡ Lite";

    // --- PULIZIA NEVE ---
    if (isLite) {
        // Se entri in Lite Mode, cancella TUTTA la neve accumulata
        const piles = document.querySelectorAll('.snow-pile');
        piles.forEach(p => p.remove());
    }
}

function showCategory(catId, btnElement) {
    const isLite = document.body.classList.contains('lite-mode');
    document.getElementById('menu-search').value = '';
    if (!isLite && btnElement) window.scrollTo({ top: 0, behavior: 'smooth' });

    const container = document.getElementById('menu-container'); const data = menuData[catId];
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); if(btnElement) btnElement.classList.add('active');

    if(data) {
        container.innerHTML = `<h3>${data.title}</h3>`;

        // LOGICA SOTTOCATEGORIE
        const subcats = [...new Set(data.items.map(i => i.subcategory))].sort();
        
        if(subcats.length > 1) {
            const preferredOrder = ['Aperitivi', 'Cocktail', 'Birre', 'Vini', 'Amari', 'Liquori', 'Grappe'];
            subcats.sort((a,b) => {
                const idxA = preferredOrder.indexOf(a);
                const idxB = preferredOrder.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
            });

            subcats.forEach(sub => {
                container.innerHTML += `<h4 class="subcategory-title">${sub}</h4>`;
                const groupItems = data.items.filter(i => i.subcategory === sub);
                renderItems(groupItems, container, isLite);
            });
        } else {
            renderItems(data.items, container, isLite);
        }
    }
}

function searchMenu() {
    const filter = document.getElementById('menu-search').value.toLowerCase();
    const container = document.getElementById('menu-container');
    if(filter.length === 0) {
        const activeBtn = document.querySelector('.tab-btn.active');
        if(activeBtn) showCategory(activeBtn.getAttribute('onclick').split("'")[1], activeBtn); 
        return;
    }
    let allMatches = [];
    for (const [key, category] of Object.entries(menuData)) {
        const matches = category.items.filter(item => item.name.toLowerCase().includes(filter));
        allMatches = [...allMatches, ...matches];
    }
    container.innerHTML = `<h3>Risultati ricerca (${allMatches.length})</h3>`;
    renderItems(allMatches, container, document.body.classList.contains('lite-mode'));
}

function renderItems(items, container, isLite) {
    items.forEach((item, index) => {
        const price = item.price.toFixed(2).replace('.', ',');
        const descHTML = item.description ? `<p>${item.description}</p>` : '';
        let tagHTML = '';
        if(item.tag === 'new') tagHTML = '<span class="tag-badge tag-new">Novità</span>';
        if(item.tag === 'hot') tagHTML = '<span class="tag-badge tag-hot">Top</span>';
        
        let allergensHTML = '';
        if(item.allergens && item.allergens.length > 0) {
            allergensHTML = '<div class="allergen-row">';
            item.allergens.forEach(a => {
                const data = allergenMap[a];
                if(data) allergensHTML += `<span class="allergen-tag">${data.icon} ${data.label}</span>`;
            });
            allergensHTML += '</div>';
        }

        container.innerHTML += `
            <div class="menu-item ${item.soldOut ? 'sold-out' : ''}" style="animation-delay: ${isLite ? 0 : index * 0.05}s">
                <div class="item-info">
                    <h4>${item.name} ${tagHTML}</h4>
                    ${descHTML}
                    ${allergensHTML}
                </div>
                <div class="item-price">€ ${price}</div>
            </div>`;
    });
}

// --- FUNZIONE NEVE REALISTICA (CURVA SUL LOGO + MORBIDA) ---
function startSnow() {
    const container = document.getElementById('snow-container');
    
    // 1. NEVE DI SFONDO
    setInterval(() => {
        if(document.hidden) return; 
        const flake = document.createElement('div');
        flake.classList.add('snowflake');
        flake.style.left = Math.random() * 100 + 'vw';
        const size = Math.random() * 3 + 3; // Un po' più grandi
        flake.style.width = size + 'px';
        flake.style.height = size + 'px';
        flake.style.filter = 'blur(1px)'; // Soffici anche quelli che cadono
        const duration = Math.random() * 3 + 4; 
        flake.style.animation = `fall ${duration}s linear forwards`;
        container.appendChild(flake);
        setTimeout(() => { flake.remove(); }, duration * 1000);
    }, 100);

    // 2. ACCUMULO INTELLIGENTE
    setInterval(() => {
        if(document.hidden) return;
        
        // --- A) LOGO (Accumulo Curvo) ---
        if (!document.body.classList.contains('lite-mode')) {   // <-- nuovo if
            const logo = document.querySelector('.logo-circle');
            if (logo && logo.querySelectorAll('.snow-pile').length < 60) {
                const pile = document.createElement('div');
                pile.classList.add('snow-pile');

                const w = Math.random() * 10 + 6;
                pile.style.width = w + 'px';
                pile.style.height = (w * 0.6) + 'px';

                const angleDeg = (Math.random() * 120) - 60;
                const angleRad = angleDeg * (Math.PI / 180);
                const radius = 29;

                const x = 29 + (Math.sin(angleRad) * radius) - (w / 2);
                const y = 29 - (Math.cos(angleRad) * radius) - (w / 2);

                pile.style.left = x + 'px';
                pile.style.top = (y - 2) + 'px';

                logo.appendChild(pile);
            }
        }

        // --- B) BARRA (Accumulo Volumetrico) ---
        if(!document.body.classList.contains('lite-mode')) {
            const bar = document.querySelector('.nav-pill-wrapper');
            // Aumentiamo il limite perché i fiocchi ora sono più trasparenti
            if(bar && bar.querySelectorAll('.snow-pile').length < 200) {
                for(let i=0; i<3; i++) { // Più veloce
                    const pile = document.createElement('div');
                    pile.classList.add('snow-pile');
                    
                    // Forme molto varie: alcune larghe e basse, altre piccole e alte
                    const w = Math.random() * 15 + 8; 
                    pile.style.width = w + 'px';
                    pile.style.height = (w * (Math.random() * 0.4 + 0.3)) + 'px'; 
                    
                    const maxLeft = bar.offsetWidth;
                    pile.style.left = (Math.random() * maxLeft - (w/2)) + 'px';
                    
                    // PROFONDITÀ: Alcuni fiocchi scendono un po' più giù sulla barra (colando), altri stanno sopra
                    const verticalOffset = Math.random() * 4 - 2; 
                    pile.style.top = (-3 + verticalOffset) + 'px';

                    bar.appendChild(pile);
                }
            }
        }

    }, 150); // Velocità accumulo
}

document.addEventListener('DOMContentLoaded', () => {
    checkOpenStatus();
    fetchWeather();
    initDataFetch();
    startSnow(); // <--- Avvia la neve qui
});
