import confetti from 'canvas-confetti';

document.addEventListener('DOMContentLoaded', () => {
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
        conversionCost: 50000, // Başlangıç çevirme maliyeti
        lastSaveTimestamp: Date.now(),
    };

    // --- OYUN YÖNETİMİ ---
    function saveGame() {
        try {
            gameState.lastSaveTimestamp = Date.now();
            localStorage.setItem('dragonblox_save', JSON.stringify(gameState));
        } catch (e) {
            console.error("Could not save game state to localStorage:", e);
        }
    }

    function loadGame() {
        const savedGame = localStorage.getItem('dragonblox_save');
        if (savedGame) {
            let parsedGame = JSON.parse(savedGame);
            
            // Eski save dosyaları için uyumluluk
            if (parsedGame.conversionCost === undefined) {
                 parsedGame.conversionCost = 50000;
            }
            if (parsedGame.lastSaveTimestamp === undefined) {
                parsedGame.lastSaveTimestamp = Date.now();
            }
            // Eski save'lerden adProgress'i temizle
            if (parsedGame.adProgress !== undefined) {
                delete parsedGame.adProgress;
            }
            gameState = parsedGame;

            // Geriye dönük uyumluluk için adProgress'i doldur
            if (!gameState.adProgress) {
                gameState.adProgress = {};
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
            gameState.eggs = 0;
            gameState.robux = 0;
            gameState.dragons = { 'red_dragon': { level: 1 } };
            gameState.equippedDragon = 'red_dragon';
            gameState.conversionCost = 50000;
            gameState.lastSaveTimestamp = Date.now();
            gameState.adProgress = {}; // adProgress'i yeni oyuncu için başlat
        }
        updateUI();
        updateAllGrids();
    }
    
    function init() {
        loadGame();
        
        // Yükleme ekranını gizle ve oyunu başlat
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            gameContainer.classList.remove('hidden');
            document.dispatchEvent(new Event('play-music-event'));
        }, 1000); 

        setInterval(gameLoop, 1000);
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
        const timeOfflineInSeconds = (Date.now() - gameState.lastSaveTimestamp) / 1000;
        
        // En az 1 dakika çevrimdışı kalmışsa kazanç ver
        if (timeOfflineInSeconds > 60) {
            const eggRate = calculateEggRate();
            let offlineEggs = timeOfflineInSeconds * eggRate;
            
            // Kazancı 5 Milyon ile sınırla
            const earningsCap = 5000000;
            offlineEggs = Math.min(offlineEggs, earningsCap);

            if (offlineEggs > 1) {
                offlineEggs = Math.floor(offlineEggs);
                gameState.eggs += offlineEggs; // Directly add earnings
                alert(`Çevrimdışıyken ${formatNumber(offlineEggs)} yumurta kazandın!`);
            }
        } 
        // Always start the game now
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
        
        // Altın ve sonrası için maliyet artışını yavaşlat
        const costMultiplier = (dragonData.price > 500000) ? 1.5 : 2;
        return dragonData.price * 0.1 * Math.pow(costMultiplier, dragonState.level - 1);
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
            
            equippedDragonContainer.innerHTML = `<img src="${dragonData.image}" alt="${dragonData.name}" title="${dragonData.name}">`;
            eggRateDisplay.textContent = `Yumurta/s: ${formatNumber(calculateEggRate())}`;
            
            upgradeLevelDisplay.textContent = `Seviye: ${dragonState.level}`;
            upgradeCostDisplay.textContent = `Yükseltme Bedeli: ${formatNumber(calculateUpgradeCost())} Yumurta`;
            upgradeButton.disabled = gameState.eggs < calculateUpgradeCost();
        } else {
             equippedDragonContainer.innerHTML = `<p>Envanterden bir ejderha seç.</p>`;
             eggRateDisplay.textContent = `Yumurta/s: 0`;
             upgradeButton.disabled = true;
             upgradeCostDisplay.textContent = `Yükseltme Bedeli: -`;
             upgradeLevelDisplay.textContent = `Seviye: -`;
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
            convertRateInfo.textContent = `1 Robux = ${formatNumber(calculateConversionCost())} Yumurta`;
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
    
    // --- DÜKKAN ---
    function renderShop() {
        shopGrid.innerHTML = '';
        DRAGONS.forEach(dragon => {
            const isOwned = !!gameState.dragons[dragon.id];
            
            const card = document.createElement('div');
            card.className = 'item-card';
            
            let buttonHtml = '';
            if (isOwned) {
                buttonHtml = `<button class="item-button" disabled>Sahipsin</button>`;
            } else {
                buttonHtml = `<button class="item-button buy-button" data-id="${dragon.id}">Satın Al</button>`;
            }
            
            card.innerHTML = `
                <img src="${dragon.image}" alt="${dragon.name}">
                <div class="dragon-name">${dragon.name}</div>
                <div class="item-info">Verim: ${formatNumber(dragon.eggRate)}/s</div>
                <div class="item-price">Fiyat: ${formatNumber(dragon.price)} Yumurta</div>
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
             // Çevirme maliyetini %30 artır
            gameState.conversionCost *= 1.30;
            audioManager.playSound('purchase');
            showConfetti();
            updateAllGrids();
            updateUI();
            saveGame();
        } else {
            alert('Bu ejderhayı satın almak için yeterli yumurtan yok!');
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
            inventoryGrid.innerHTML = `<p>Hiç ejderhan yok. Dükkandan satın al!</p>`;
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
                <img src="${dragonData.image}" alt="${dragonData.name}">
                <div class="dragon-name">${dragonData.name}</div>
                <button class="item-button equip-button" data-id="${dragonId}">
                    ${gameState.equippedDragon === dragonId ? 'Takılı' : 'Tak'}
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
        const cost = calculateUpgradeCost();
        if (gameState.eggs >= cost) {
            gameState.eggs -= cost;
            gameState.dragons[gameState.equippedDragon].level++;
            // Çevirme maliyetini %10 artır
            gameState.conversionCost *= 1.10;
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
            alert(`Çevirmek için yeterli yumurtan yok (en az ${formatNumber(costPerRobux)} gerekli).`);
            return;
        }

        const robuxGained = Math.floor(gameState.eggs / costPerRobux);
        const eggsSpent = robuxGained * costPerRobux;

        if (robuxGained > 0) {
            gameState.eggs -= eggsSpent;
            gameState.robux += robuxGained;

            alert(`${formatNumber(robuxGained)} Robux kazandın!`);
            audioManager.playSound('purchase');
            updateUI(); // UI'ı ve dolayısıyla yeni dönüşüm oranını güncelle
            saveGame();
        }
    }

    async function withdrawRobux() {
        const amountInput = document.getElementById('withdraw-amount-modal');
        const urlInput = document.getElementById('gamepass-url-modal');
        const withdrawButton = document.getElementById('withdraw-button-modal');
        const amount = parseInt(amountInput.value, 10);
        const url = urlInput.value.trim();

        if (isNaN(amount) || amount < 50) {
            alert('Minimum 50 Robux çekebilirsin.');
            return;
        }
        if (url === '') {
            alert('Lütfen geçerli bir Gamepass linki girin.');
            return;
        }
        if (gameState.robux < amount) {
            alert('Çekmek istediğin miktar kadar Robux\'un yok.');
            return;
        }

        // Disable button and show loading state
        withdrawButton.disabled = true;
        withdrawButton.textContent = 'Gönderiliyor...';

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
                alert(`${amount} Robux çekme talebi başarıyla gönderildi! Ödemen 24-72 saat içinde yapılacaktır.`);
                updateUI();
                saveGame();
                amountInput.value = '';
                urlInput.value = '';
                withdrawModal.classList.add('hidden'); // Close modal on success
            } else {
                const errorText = await response.text();
                console.error('Webhook error response:', response.status, errorText);
                alert(`Çekme talebi gönderilirken bir sunucu hatası oluştu (Hata: ${response.status}). Lütfen daha sonra tekrar deneyin.`);
            }
        } catch (error) {
            console.error('Error sending withdrawal request:', error);
            alert('Çekme talebi gönderilirken bir ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
        } finally {
            // Re-enable button
            withdrawButton.disabled = false;
            withdrawButton.textContent = 'Çekim Talebi Gönder';
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

        document.querySelectorAll('footer .nav-button').forEach(btn => {
             btn.classList.remove('active');
        });
        const activeButton = document.querySelector(`footer .nav-button[data-page="${pageId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
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
    
    // --- OLAY DİNLEYİCİLER ---
    
    // Navigasyon
    document.querySelector('footer nav').addEventListener('click', (e) => {
        if (e.target.matches('.nav-button')) {
            const pageId = e.target.dataset.page;
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
    convertRobuxButton.onclick = () => { convertToRobux(); audioManager.playSound('click'); };
    
    robuxCounter.onclick = () => {
        // switchPage('convert-page'); // Eski davranış
        withdrawModal.classList.remove('hidden'); // Yeni davranış: modalı aç
        audioManager.playSound('click');
    };

    withdrawModal.querySelector('.close-button').onclick = () => {
        withdrawModal.classList.add('hidden');
        audioManager.playSound('click');
    };
    
    withdrawButtonModal.onclick = () => { withdrawRobux(); audioManager.playSound('click'); };

    document.getElementById('withdraw-button-convert').onclick = () => { withdrawRobux(); audioManager.playSound('click'); };
    
    document.getElementById('gamepass-info-link-convert').onclick = (e) => {
        e.preventDefault();
        gamepassInfoModal.classList.remove('hidden');
        audioManager.playSound('click');
    };

    document.getElementById('gamepass-info-link').onclick = (e) => {
        e.preventDefault();
        gamepassInfoModal.classList.remove('hidden');
        audioManager.playSound('click');
    };
    
    gamepassInfoModal.querySelector('.close-button').onclick = () => {
        gamepassInfoModal.classList.add('hidden');
        audioManager.playSound('click');
    };
    
    // Yükseltme
    upgradeButton.onclick = () => {
        upgradeDragon();
    };

    // Oyunu başlat
    init();
});