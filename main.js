import confetti from 'canvas-confetti';

document.addEventListener('DOMContentLoaded', () => {
    // Firebase
    const { 
        signUp, 
        signIn, 
        signOutUser, 
        onAuth,
        saveGameToFirestore,
        loadGameFromFirestore
    } = window.firebaseManager;

    // Auth Screen
    const authContainer = document.getElementById('auth-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showLoginBtn = document.getElementById('show-login-btn');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const authErrorDisplay = document.getElementById('auth-error');
    const logoutButton = document.getElementById('logout-button');

    // DOM Öğeleri
    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');
    const eggsDisplay = document.getElementById('eggs');
    const robuxDisplay = document.getElementById('robux');
    const robuxCounter = document.getElementById('robux-counter');
    const equippedDragonContainer = document.getElementById('equipped-dragon-container');
    const eggRateDisplay = document.getElementById('egg-rate');
    const upgradeButton = document.getElementById('upgrade-button');
    const upgradeCostDisplay = document.getElementById('upgrade-cost');
    const upgradeLevelDisplay = document.getElementById('upgrade-level');
    const savingIndicator = document.getElementById('saving-indicator');
    const languageSelector = document.getElementById('language-selector');
    
    // Butonlar
    const convertRobuxButton = document.getElementById('convert-robux-button');
    const withdrawButtonModal = document.getElementById('withdraw-button-modal');
    
    // Sayfalar
    const pages = {
        'main-page': document.getElementById('main-page'),
        'shop-page': document.getElementById('shop-page'),
        'inventory-page': document.getElementById('inventory-page'),
        'upgrade-page': document.getElementById('upgrade-page'),
        'convert-page': document.getElementById('convert-page'),
    };
    
    // Gridler
    const shopGrid = document.getElementById('shop-grid');
    const inventoryGrid = document.getElementById('inventory-grid');
    
    // Modallar
    const adModal = document.getElementById('ad-modal');
    const withdrawModal = document.getElementById('withdraw-modal');
    const gamepassInfoModal = document.getElementById('gamepass-info-modal');
    
    // Ses
    const audioManager = window.audioManager;

    // Oyun Verisi
    let gameState = {
        eggs: 0,
        robux: 0,
        dragons: {}, // { dragonId: { level: 1 } } -> Sadece sahip olunan ejderhalar
        equippedDragon: null,
        /* @tweakable The starting egg cost for converting 1 Robux. */
        conversionCost: 50000, // Başlangıç çevirme maliyeti
        lastSaveTimestamp: Date.now(),
        language: 'tr', // Default language
    };

    /* @tweakable The maximum level a dragon can reach through upgrades. */
    const MAX_DRAGON_LEVEL = 20;
    /* @tweakable The base cost for upgrading the free starter dragon (Red Dragon). */
    const starterDragonUpgradeBaseCost = 5;
    /* @tweakable The multiplier applied to a dragon's price to determine its base upgrade cost. */
    const upgradeCostPriceMultiplier = 0.1;
    /* @tweakable The exponential multiplier for upgrade costs. Higher value means costs increase faster per level. */
    const upgradeCostLevelExponent = 2.4;
    /* @tweakable The multiplier for increasing Robux conversion cost after buying a new dragon. */
    const conversionCostIncreaseOnBuy = 1.4;
    /* @tweakable The multiplier for increasing Robux conversion cost after an upgrade. */
    const conversionCostIncreaseOnUpgrade = 1.02;

    let isSaving = false;
    let currentUserId = null;
    let gameLoopInterval = null;
    let saveGameInterval = null;

    // --- DİL YÖNETİMİ ---
    let currentLanguage = 'tr';

    function translateUI() {
        currentLanguage = gameState.language || 'tr';
        languageSelector.value = currentLanguage;
        
        document.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.getAttribute('data-translate');
            if (translations[currentLanguage] && translations[currentLanguage][key]) {
                el.innerHTML = translations[currentLanguage][key];
            }
        });
        
        // Update placeholders
        document.getElementById('login-email').placeholder = getTranslation('auth_email_placeholder');
        document.getElementById('login-password').placeholder = getTranslation('auth_password_placeholder');
        document.getElementById('register-email').placeholder = getTranslation('auth_email_placeholder');
        document.getElementById('register-password').placeholder = getTranslation('auth_password_min_char');

        const withdrawAmountInput = document.getElementById('withdraw-amount-modal');
        if(withdrawAmountInput) withdrawAmountInput.placeholder = getTranslation('withdraw_placeholder_amount');

        const gamepassUrlInput = document.getElementById('gamepass-url-modal');
        if(gamepassUrlInput) gamepassUrlInput.placeholder = getTranslation('withdraw_placeholder_url');
        
        // Update titles that are not handled by the loop
        document.querySelector('button[data-page="main-page"]').title = getTranslation('nav_main_menu');
        document.querySelector('button[data-page="shop-page"]').title = getTranslation('nav_shop');
        document.querySelector('button[data-page="inventory-page"]').title = getTranslation('nav_inventory');
        document.querySelector('button[data-page="upgrade-page"]').title = getTranslation('nav_upgrade');
        document.querySelector('button[data-page="convert-page"]').title = getTranslation('nav_convert');
        document.getElementById('robux-counter').title = getTranslation('withdraw_robux_title');


        // Re-render dynamic content that needs translation
        updateUI();
        updateAllGrids();
    }

    function getTranslation(key, replacements = {}) {
        let text = translations[currentLanguage]?.[key] || translations['tr']?.[key] || `[${key}]`;
        for (const placeholder in replacements) {
            text = text.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return text;
    }

    // --- OYUN YÖNETİMİ ---
    async function saveGame() {
        if (isSaving || !currentUserId) return;
        isSaving = true;
        savingIndicator.textContent = getTranslation('saving_indicator_saving');
        savingIndicator.classList.remove('hidden');
        savingIndicator.style.opacity = '1';

        try {
            await saveGameToFirestore(currentUserId, gameState);
            
            setTimeout(() => {
                savingIndicator.textContent = getTranslation('saving_indicator_saved');
                setTimeout(() => {
                    savingIndicator.style.opacity = '0';
                    setTimeout(() => {
                        savingIndicator.classList.add('hidden');
                        isSaving = false;
                    }, 500);
                }, 1000);
            }, 200);

        } catch (e) {
            console.error("Could not save game state to Firestore:", e);
            savingIndicator.textContent = getTranslation('saving_indicator_error');
            setTimeout(() => {
                savingIndicator.style.opacity = '0';
                 setTimeout(() => {
                    savingIndicator.classList.add('hidden');
                    isSaving = false;
                }, 500);
            }, 2000);
        }
    }

    async function loadGame(userId) {
        const savedGame = await loadGameFromFirestore(userId);
        
        if (savedGame) {
            // Merge loaded data with defaults to prevent missing properties
            gameState = {
                ...gameState, // Keep defaults for any new properties
                ...savedGame,
            };

            // Geriye dönük uyumluluk için eski save dosyalarını düzelt
            if (!gameState.dragons) gameState.dragons = {};
             if (gameState.conversionCost === undefined) gameState.conversionCost = 50000;
             if (gameState.language === undefined) {
                const browserLang = navigator.language.split('-')[0];
                gameState.language = (browserLang === 'en') ? 'en' : 'tr';
            }
            // Eski save'lerden adProgress'i temizle
            if (gameState.adProgress !== undefined) {
                delete gameState.adProgress;
            }
            
            // Geriye dönük uyumluluk için eski save dosyalarını düzelt
            if (gameState.dragons) {
                Object.keys(gameState.dragons).forEach(id => {
                    const dragonData = DRAGONS.find(d => d.id === id);
                    if (gameState.dragons[id] && gameState.dragons[id].adWatched !== undefined && dragonData) {
                        delete gameState.dragons[id].adWatched;
                    }
                });
            }

        } else {
            // Yeni oyuncu
            gameState = {
                eggs: 0,
                robux: 0,
                dragons: { 'red_dragon': { level: 1 } },
                equippedDragon: 'red_dragon',
                conversionCost: 50000,
                language: 'tr',
            };
            const browserLang = navigator.language.split('-')[0];
            gameState.language = (browserLang === 'en') ? 'en' : 'tr';
        }
        translateUI(); // Translate after loading the correct language
        updateAllGrids();
    }
    
    function startGame() {
        // Stop any existing intervals
        if(gameLoopInterval) clearInterval(gameLoopInterval);
        if(saveGameInterval) clearInterval(saveGameInterval);
        
        // Show the game and hide loading/auth screens
        loadingScreen.classList.add('hidden');
        authContainer.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        logoutButton.classList.remove('hidden');

        document.dispatchEvent(new Event('play-music-event'));

        gameLoopInterval = setInterval(gameLoop, 1000);
        saveGameInterval = setInterval(saveGame, 15000);
    }
    
    function resetGame() {
        // Stop intervals
        if(gameLoopInterval) clearInterval(gameLoopInterval);
        if(saveGameInterval) clearInterval(saveGameInterval);

        // Reset state
        currentUserId = null;
        gameState = {
            eggs: 0,
            robux: 0,
            dragons: {},
            equippedDragon: null,
            conversionCost: 50000,
            language: 'tr',
        };

        // Show auth screen, hide game
        gameContainer.classList.add('hidden');
        logoutButton.classList.add('hidden');
        authContainer.classList.remove('hidden');
        document.getElementById('loading-screen').classList.add('hidden');
        
        // Reset UI to default state
        switchPage('main-page');
        translateUI();
    }
    
    function init() {
        setupEventListeners();
        
        onAuth(async (user) => {
            if (user) {
                // User is signed in.
                currentUserId = user.uid;
                authContainer.classList.add('hidden');
                loadingScreen.classList.remove('hidden');
                await loadGame(user.uid);
                startGame();
            } else {
                // User is signed out.
                resetGame();
            }
        });
    }
    
    function gameLoop() {
        if (gameState.equippedDragon) {
            const eggRate = calculateEggRate();
            gameState.eggs += eggRate;
            updateUI();
        }
    }

    // --- ÇEVRİMDIŞI KAZANÇ ---
    function checkOfflineEarnings() {
        // This function is no longer needed with Firestore saves.
        // It's kept to avoid breaking calls but its content can be removed.
        gameContainer.classList.remove('hidden');
        document.dispatchEvent(new Event('play-music-event'));
    }

    // --- HESAPLAMALAR ---
    function calculateEggRate() {
        if (!gameState.equippedDragon) return 0;
        const dragonId = gameState.equippedDragon;
        const dragonData = DRAGONS.find(d => d.id === dragonId);
        const dragonState = gameState.dragons[dragonId];
        if (!dragonData || !dragonState) return 0;
        
        return dragonData.eggRate * Math.pow(1.5, dragonState.level - 1); // Her seviye %50 artış
    }

    function calculateUpgradeCost() {
        if (!gameState.equippedDragon) return Infinity;
        const dragonId = gameState.equippedDragon;
        const dragonData = DRAGONS.find(d => d.id === dragonId);
        const dragonState = gameState.dragons[dragonId];
        if (!dragonData || !dragonState) return Infinity;
        
        // Handle max level case for cost display
        if (dragonState.level >= MAX_DRAGON_LEVEL) {
            return Infinity;
        }

        const baseCost = dragonData.price > 0
            ? dragonData.price * upgradeCostPriceMultiplier
            : starterDragonUpgradeBaseCost;

        return baseCost * Math.pow(upgradeCostLevelExponent, dragonState.level - 1);
    }

    function calculateConversionCost() {
        // Artık doğrudan gameState'den okunuyor
        return gameState.conversionCost;
    }

    // --- ARAYÜZ GÜNCELLEME ---
    function updateUI() {
        eggsDisplay.textContent = formatNumber(gameState.eggs);
        robuxDisplay.textContent = formatNumber(gameState.robux);
        
        if (gameState.equippedDragon) {
            const dragonData = DRAGONS.find(d => d.id === gameState.equippedDragon);
            const dragonState = gameState.dragons[gameState.equippedDragon];
            
            equippedDragonContainer.innerHTML = `<img src="${dragonData.image}" alt="${getDragonName(dragonData)}" title="${getDragonName(dragonData)}">`;
            eggRateDisplay.textContent = `${getTranslation('egg_rate_prefix')}${formatNumber(calculateEggRate())}`;
            
            if (dragonState.level >= MAX_DRAGON_LEVEL) {
                upgradeLevelDisplay.textContent = `${getTranslation('level_prefix')}${dragonState.level} (MAX)`;
                upgradeCostDisplay.textContent = getTranslation('upgrade_cost_prefix') + "---";
                upgradeButton.disabled = true;
            } else {
                upgradeLevelDisplay.textContent = `${getTranslation('level_prefix')}${dragonState.level}`;
                upgradeCostDisplay.textContent = `${getTranslation('upgrade_cost_prefix')}${formatNumber(calculateUpgradeCost())}`;
                upgradeButton.disabled = gameState.eggs < calculateUpgradeCost();
            }

        } else {
             equippedDragonContainer.innerHTML = `<p>${getTranslation('no_dragon_equipped')}</p>`;
             eggRateDisplay.textContent = `${getTranslation('egg_rate_prefix')}0`;
             upgradeButton.disabled = true;
             upgradeCostDisplay.textContent = `${getTranslation('upgrade_cost_prefix')}-`;
             upgradeLevelDisplay.textContent = `${getTranslation('level_prefix')}-`;
        }
        updateConvertPage();
    }
    
    function updateAllGrids() {
        renderShop();
        renderInventory();
    }

    function updateConvertPage() {
        const convertRateInfo = document.getElementById('convert-rate-info');
        if (convertRateInfo) {
            convertRateInfo.textContent = getTranslation('conversion_rate', { cost: formatNumber(calculateConversionCost()) });
        }
    }

    function formatNumber(num) {
        if (num === undefined || num === null) return '0';
        num = parseFloat(num);
        if (num < 1000) return num.toFixed(0);
        const si = [
            {v: 1E3, s: "K"},
            {v: 1E6, s: "M"},
            {v: 1E9, s: "B"},
            {v: 1E12, s: "T"},
            {v: 1E15, s: "P"},
            {v: 1E18, s: "E"}
        ];
        let i;
        for (i = si.length - 1; i > 0; i--) {
            if (num >= si[i].v) {
                break;
            }
        }
        return (num / si[i].v).toFixed(2).replace(/\.00$/, "").replace(/\.([1-9])0$/, ".$1") + si[i].s;
    }
    
    function getDragonName(dragonData) {
        return translations[currentLanguage]?.dragons?.[dragonData.id] || dragonData.name;
    }
    
    // --- DÜKKAN ---
    function renderShop() {
        shopGrid.innerHTML = '';
        DRAGONS.forEach(dragon => {
            const isOwned = !!gameState.dragons[dragon.id];
            
            const card = document.createElement('div');
            card.className = 'item-card';
            
            let buttonHtml = '';
            if (isOwned) {
                buttonHtml = `<button class="item-button" disabled>${getTranslation('shop_owned')}</button>`;
            } else {
                buttonHtml = `<button class="item-button buy-button" data-id="${dragon.id}">${getTranslation('shop_buy')}</button>`;
            }
            
            card.innerHTML = `
                <img src="${dragon.image}" alt="${getDragonName(dragon)}">
                <div class="dragon-name">${getDragonName(dragon)}</div>
                <div class="item-info">${getTranslation('shop_yield', { rate: formatNumber(dragon.eggRate) })}</div>
                <div class="item-price">${getTranslation('shop_price', { price: formatNumber(dragon.price) })}</div>
                ${buttonHtml}
            `;
            
            shopGrid.appendChild(card);
        });
    }
    
    function buyDragon(dragonId) {
        const dragonData = DRAGONS.find(d => d.id === dragonId);
        if (gameState.eggs >= dragonData.price) {
            gameState.eggs -= dragonData.price;
            gameState.dragons[dragonId] = { level: 1 };
            if (dragonData.price > 0) {
                 // Çevirme maliyetini artır
                gameState.conversionCost *= conversionCostIncreaseOnBuy;
            }
            audioManager.playSound('purchase');
            showConfetti();
            updateAllGrids();
            updateUI();
            saveGame();
        } else {
            alert(getTranslation('alert_not_enough_eggs'));
        }
    }
    
    function startAdWatch(dragonId) {
        const adDuration = 3000; // 3 saniye
        document.getElementById('ad-modal-title').textContent = 'Reklam İzleniyor...';
        document.getElementById('ad-modal-text').textContent = 'Ejderha satın alma kilidini açmak için lütfen bekleyin.';
        adModal.classList.remove('hidden');

        const adTimer = adModal.querySelector('.ad-timer-bar');
        adTimer.style.animation = 'none';
        void adTimer.offsetWidth; // reflow
        adTimer.style.animation = `ad-timer ${adDuration / 1000}s linear forwards`;

        setTimeout(() => {
            const success = Math.random() > 0.2; // %80 başarı şansı

            if (success) {
                document.getElementById('ad-modal-title').textContent = 'Reklam Başarılı!';
                document.getElementById('ad-modal-text').textContent = 'Kilit açma ilerlemesi kaydedildi.';
                gameState.adProgress[dragonId] = (gameState.adProgress[dragonId] || 0) + 1;
                audioManager.playSound('click');
                updateAllGrids();
                saveGame();
            } else {
                document.getElementById('ad-modal-title').textContent = 'Reklam İzlenemedi!';
                document.getElementById('ad-modal-text').textContent = 'Lütfen daha sonra tekrar deneyin.';
            }

            setTimeout(() => {
                adModal.classList.add('hidden');
            }, 1500); // Mesajı göstermek için 1.5 saniye bekle

        }, adDuration);
        
        if (gameState.equippedDragon === null && Object.keys(gameState.dragons).length > 0) {
            // Eğer hiç ejderha takılı değilse, satın alınan yeni ejderhayı otomatik tak
            equipDragon(dragonId);
        }
    }

    // --- ENVANTER ---
    function renderInventory() {
        inventoryGrid.innerHTML = '';
        if (Object.keys(gameState.dragons).length === 0) {
            inventoryGrid.innerHTML = `<p>${getTranslation('inventory_empty')}</p>`;
            return;
        }
        Object.keys(gameState.dragons).forEach(dragonId => {
            const dragonData = DRAGONS.find(d => d.id === dragonId);
            if (!dragonData) return;
            
            const card = document.createElement('div');
            card.className = 'item-card';
            if(gameState.equippedDragon === dragonId) {
                card.classList.add('equipped');
            }
            
            card.innerHTML = `
                <img src="${dragonData.image}" alt="${getDragonName(dragonData)}">
                <div class="dragon-name">${getDragonName(dragonData)}</div>
                <button class="item-button equip-button" data-id="${dragonId}">
                    ${gameState.equippedDragon === dragonId ? getTranslation('inventory_equipped') : getTranslation('inventory_equip')}
                </button>
            `;
            inventoryGrid.appendChild(card);
        });
    }
    
    function equipDragon(dragonId) {
        gameState.equippedDragon = dragonId;
        audioManager.playSound('equip');
        updateAllGrids();
        updateUI();
        switchPage('main-page'); // Ana sayfaya dön
        saveGame();
    }
    
    // --- YÜKSELTME ---
    function upgradeDragon() {
        if (!gameState.equippedDragon) return;
        
        const dragonState = gameState.dragons[gameState.equippedDragon];
        if (!dragonState || dragonState.level >= MAX_DRAGON_LEVEL) {
            return; // Do nothing if at max level or no dragon
        }

        const cost = calculateUpgradeCost();
        if (gameState.eggs >= cost) {
            gameState.eggs -= cost;
            dragonState.level++;
            // Her yükseltmede çevirme maliyetini artır
            gameState.conversionCost *= conversionCostIncreaseOnUpgrade;
            audioManager.playSound('purchase');
            showConfetti();
            updateUI(); // Bu UI güncellemesi conversion cost'u da güncelleyecek
            saveGame();
        }
    }

    // --- ROBUX ÇEVİRME ---
    function convertToRobux() {
        const costPerRobux = calculateConversionCost();
        if (gameState.eggs < costPerRobux) {
            alert(getTranslation('alert_conversion_not_enough', { cost: formatNumber(costPerRobux) }));
            return;
        }

        const robuxGained = Math.floor(gameState.eggs / costPerRobux);
        const eggsSpent = robuxGained * costPerRobux;

        if (robuxGained > 0) {
            gameState.eggs -= eggsSpent;
            gameState.robux += robuxGained;
            // Çevirme maliyeti artık satın alma ve yükseltme ile artıyor.
            alert(getTranslation('alert_robux_gained', { amount: formatNumber(robuxGained) }));
            audioManager.playSound('purchase');
            updateUI(); // UI'ı ve dolayısıyla yeni dönüşüm oranını güncelle
            saveGame();
        }
    }

    async function withdrawRobux() {
        const amountInput = document.getElementById('withdraw-amount-modal');
        const urlInput = document.getElementById('gamepass-url-modal');
        const withdrawButton = withdrawButtonModal;

        const amount = parseInt(amountInput.value, 10);
        const url = urlInput.value.trim();

        if (isNaN(amount) || amount < 50) {
            alert(getTranslation('alert_withdraw_min_amount'));
            return;
        }
        if (url === '') {
            alert(getTranslation('alert_withdraw_invalid_url'));
            return;
        }
        if (gameState.robux < amount) {
            alert(getTranslation('alert_withdraw_not_enough_robux'));
            return;
        }

        // Disable button and show loading state
        withdrawButton.disabled = true;
        withdrawButton.textContent = getTranslation('withdraw_sending');

        const webhookUrl = 'https://eos5yjgvkh1gbmh.m.pipedream.net';
        const data = {
            amount: amount,
            gamepassUrl: url,
            timestamp: new Date().toISOString()
        };

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                gameState.robux -= amount;
                alert(getTranslation('alert_withdraw_success', { amount: amount }));
                updateUI();
                saveGame();
                amountInput.value = '';
                urlInput.value = '';
                withdrawModal.classList.add('hidden'); // Close modal on success
            } else {
                const errorText = await response.text();
                console.error('Webhook error response:', response.status, errorText);
                alert(getTranslation('alert_withdraw_server_error', { status: response.status }));
            }
        } catch (error) {
            console.error('Error sending withdrawal request:', error);
            alert(getTranslation('alert_withdraw_network_error'));
        } finally {
            // Re-enable button
            withdrawButton.disabled = false;
            withdrawButton.textContent = getTranslation('withdraw_button');
        }
    }
    
    // --- EFEKTLER ---
    function showConfetti() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
    
    // --- NAVİGASYON ---
    function switchPage(pageId) {
        Object.values(pages).forEach(page => page.classList.add('hidden'));
        if (pages[pageId]) {
            pages[pageId].classList.remove('hidden');
        }

        document.querySelectorAll('#main-nav .nav-button').forEach(btn => {
             btn.classList.remove('active');
        });
        const activeButton = document.querySelector(`#main-nav .nav-button[data-page="${pageId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // Scroll to top on page switch for scrollable pages
        if (pages[pageId] && pages[pageId].classList.contains('scrollable-page')) {
            pages[pageId].scrollTop = 0;
        }
    }
    
    // --- MÜZİK KONTROLÜ ---
    // Sayfa göründüğünde müziği çalmak için olay dinleyici
    document.addEventListener('play-music-event', () => {
         // Eğer modal açık değilse müziği çal
        if (loadingScreen.classList.contains('hidden')) {
            audioManager.playMusic('background_music');
        }
    });

    // Sayfa gizlendiğinde oyunu kaydet
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveGame();
        }
    });
    
    // --- OLAY DİNLEYİCİLER ---
    function setupEventListeners() {
        // Auth Listeners
        showLoginBtn.addEventListener('click', () => {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            showLoginBtn.classList.add('active');
            showRegisterBtn.classList.remove('active');
            authErrorDisplay.classList.add('hidden');
        });
        
        showRegisterBtn.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            showLoginBtn.classList.remove('active');
            showRegisterBtn.classList.add('active');
            authErrorDisplay.classList.add('hidden');
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            showAuthError(getTranslation('auth_logging_in'), false);
            const error = await signIn(email, password);
            if (error) {
                showAuthError(getTranslation(error));
            } else {
                authErrorDisplay.classList.add('hidden');
            }
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            showAuthError(getTranslation('auth_registering'), false);
            const error = await signUp(email, password);
            if (error) {
                showAuthError(getTranslation(error));
            } else {
                authErrorDisplay.classList.add('hidden');
            }
        });

        logoutButton.addEventListener('click', () => {
            saveGame().then(() => {
                signOutUser();
            });
        });

        // Navigasyon
        document.getElementById('main-nav').addEventListener('click', (e) => {
            const navButton = e.target.closest('.nav-button');
            if (navButton) {
                const pageId = navButton.dataset.page;
                if (pageId) {
                    switchPage(pageId);
                    audioManager.playSound('click');
                }
            }
        });

        // Dükkan Etkileşimleri
        shopGrid.addEventListener('click', (e) => {
            const button = e.target.closest('.item-button');
            if (!button) return;

            audioManager.playSound('click');
            if (button.classList.contains('buy-button')) {
                buyDragon(button.dataset.id);
            }
        });
        
        // Envanter Etkileşimleri
        inventoryGrid.addEventListener('click', (e) => {
            const button = e.target.closest('.equip-button');
            if (button) {
                equipDragon(button.dataset.id);
            }
        });

        // Çevirme ve Çekme
        convertRobuxButton.addEventListener('click', () => {
            convertToRobux();
            audioManager.playSound('click');
        });
        
        robuxCounter.addEventListener('click', () => {
            withdrawModal.classList.remove('hidden');
            audioManager.playSound('click');
        });

        // Modal Kapatma
        withdrawModal.querySelector('.close-button').addEventListener('click', () => {
            withdrawModal.classList.add('hidden');
            audioManager.playSound('click');
        });
        
        // Çekim Butonları
        withdrawButtonModal.addEventListener('click', () => {
            withdrawRobux();
            audioManager.playSound('click');
        });
        
        // Gamepass Bilgi Linkleri
        document.getElementById('gamepass-info-link').addEventListener('click', (e) => {
            e.preventDefault();
            gamepassInfoModal.classList.remove('hidden');
            audioManager.playSound('click');
        });
        
        gamepassInfoModal.querySelector('.close-button').addEventListener('click', () => {
            gamepassInfoModal.classList.add('hidden');
            audioManager.playSound('click');
        });
        
        // Yükseltme
        upgradeButton.addEventListener('click', () => {
            upgradeDragon();
        });
    }

    function showAuthError(message, isError = true) {
        authErrorDisplay.textContent = message;
        authErrorDisplay.classList.remove('hidden');
        authErrorDisplay.style.color = isError ? 'red' : 'white';
    }

    // Oyunu başlat
    init();
});