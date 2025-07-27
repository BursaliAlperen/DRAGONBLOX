window.audioManager = (() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let isUnlocked = false;
    const sounds = {};
    const musicSource = {};

    async function loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            sounds[name] = audioBuffer;
        } catch (error) {
            console.error(`Error loading sound ${name}:`, error);
        }
    }
    
    async function loadMusic(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            sounds[name] = audioBuffer;
        } catch(error) {
            console.error(`Error loading music ${name}:`, error);
        }
    }

    function playSound(name) {
        if (!isUnlocked) return;
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        if (sounds[name]) {
            const source = audioContext.createBufferSource();
            source.buffer = sounds[name];
            source.connect(audioContext.destination);
            source.start(0);
        }
    }
    
    function playMusic(name, loop = true) {
        if (!isUnlocked) return;
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        // Eğer zaten çalıyorsa durdur ve yeniden başlatma
        if (musicSource[name] && musicSource[name].isPlaying) {
            return;
        }

        if (sounds[name]) {
            // Önceki müziği durdur
            Object.values(musicSource).forEach(src => {
                if (src.source) src.source.stop();
                src.isPlaying = false;
            });

            const source = audioContext.createBufferSource();
            source.buffer = sounds[name];
            source.loop = loop;
            source.connect(audioContext.destination);
            source.start(0);
            
            musicSource[name] = { source: source, isPlaying: true };
        }
    }


    // Uygulama başlangıcında sesleri yükle
    loadSound('click', 'click.mp3');
    loadSound('purchase', 'purchase.mp3');
    loadSound('equip', 'equip.mp3');
    loadMusic('background_music', 'background_music.mp3');

    // Kullanıcı etkileşimiyle AudioContext'i başlatma
    const unlockAudio = () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                isUnlocked = true;
                // Müzik çalması gerekiyorsa, burada tetiklenebilir.
                // Örneğin, ana oyun mantığı bir event gönderebilir.
                document.dispatchEvent(new Event('audio-unlocked'));
            });
        } else {
            isUnlocked = true;
        }
        document.body.removeEventListener('click', unlockAudio);
        document.body.removeEventListener('touchend', unlockAudio);
    };
    document.body.addEventListener('click', unlockAudio);
    document.body.addEventListener('touchend', unlockAudio);

    return {
        playSound,
        playMusic
    };
})();