document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements first
    const innerBox = document.querySelector('.inner-box');
    const outerBox = document.querySelector('.outer-box');
    const card = document.querySelector('.card');
    const card_p = card.querySelector('p');

    // Game state variables
    let gameState = 'ready'; // 'ready', 'typing', 'done'
    let startTime = null;
    let endTime = null;
    let totalGameTime = 60; // 60-second game window
    let gameTimer = null;
    let timeRemaining = totalGameTime;
    let currentStats = {
        totalSentences: 0,
        totalWPM: 0,
        totalAccuracy: 0,
        bestWPM: 0,
        worstWPM: Infinity,
        correctChars: 0,
        totalChars: 0
    };

    // Arena sizing constants
    const maxWidth = outerBox.offsetWidth - 40;
    const maxHeight = outerBox.offsetHeight - 40;
    const minWidth = card.offsetWidth + 40;
    const minHeight = card.offsetHeight + 40;
    const shrinkDuration = 45; // Seconds to shrink to minimum if inactive
    const growthPixels = 30; // Pixels to grow when typing correctly
    let currentWidth = maxWidth;
    let currentHeight = maxHeight;
    let lastActiveTime = Date.now();

    // Fetch a random sentence from the server
    async function fetchRandomSentence() {
        try {
            const response = await fetch('http://localhost:3000/random-sentence');
            const data = await response.json();
            return data.sentence || "Default fallback sentence";
        } catch (error) {
            console.error('Failed to fetch random sentence:', error);
            return "Default fallback sentence";
        }
    }

    // Improved function to jumble letters within each word
    function jumbleSentence(sentence) {
        return sentence.split(' ').map(word => {
            // Convert word to array for better manipulation
            const chars = word.split('');
            
            // Preserve first and last characters, shuffle the middle
            if (chars.length > 3) {
                const first = chars[0];
                const last = chars[chars.length - 1];
                const middle = chars.slice(1, -1);
                
                // Shuffle middle characters
                for (let i = middle.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [middle[i], middle[j]] = [middle[j], middle[i]];
                }
                
                return [first, ...middle, last].join('');
            }
            
            // For short words, use original shuffling
            for (let i = chars.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [chars[i], chars[j]] = [chars[j], chars[i]];
            }

            return chars.join('');
        }).join(' ');
    }

    // Create a container for tracking typing
    const jumbledTextContainer = document.createElement('div');
    jumbledTextContainer.style.position = 'absolute';
    jumbledTextContainer.style.top = '0';
    jumbledTextContainer.style.left = '0';
    jumbledTextContainer.style.width = '100%';
    jumbledTextContainer.style.height = '100%';
    jumbledTextContainer.style.pointerEvents = 'none';
    jumbledTextContainer.style.display = 'flex';
    jumbledTextContainer.style.justifyContent = 'center';
    jumbledTextContainer.style.alignItems = 'center';
    jumbledTextContainer.style.color = 'rgba(0,0,0,0.2)';
    jumbledTextContainer.style.fontSize = '18px';
    jumbledTextContainer.style.fontWeight = 'bold';

    const jumbledText = document.createElement('p');
    jumbledText.style.margin = '0';
    jumbledText.style.textAlign = 'center';
    jumbledText.style.width = '100%';

    jumbledTextContainer.appendChild(jumbledText);

    // Create a typing overlay
    const typingOverlay = document.createElement('div');
    typingOverlay.style.position = 'absolute';
    typingOverlay.style.top = '0';
    typingOverlay.style.left = '0';
    typingOverlay.style.width = '100%';
    typingOverlay.style.height = '100%';
    typingOverlay.style.pointerEvents = 'none';
    typingOverlay.style.display = 'flex';
    typingOverlay.style.justifyContent = 'center';
    typingOverlay.style.alignItems = 'center';

    const typingText = document.createElement('p');
    typingText.style.margin = '0';
    typingText.style.textAlign = 'center';
    typingText.style.width = '100%';
    typingText.style.zIndex = '10';

    typingOverlay.appendChild(typingText);

    // Create stats display elements
    const statsContainer = document.createElement('div');
    statsContainer.className = 'game-stats';
    statsContainer.innerHTML = `
        <div class="stat-group">
            <div class="stat-item">
                <span class="stat-label">Time</span>
                <span class="stat-value" id="timer">60s</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Sentences</span>
                <span class="stat-value" id="sentences">0</span>
            </div>
        </div>
        <div class="stat-group">
            <div class="stat-item">
                <span class="stat-label">WPM</span>
                <span class="stat-value" id="wpm">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Accuracy</span>
                <span class="stat-value" id="accuracy">100%</span>
            </div>
        </div>
        <div class="stat-group extended-stats">
            <div class="stat-item">
                <span class="stat-label">Best WPM</span>
                <span class="stat-value" id="best-wpm">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Chars/Min</span>
                <span class="stat-value" id="chars-per-min">0</span>
            </div>
        </div>
    `;

    // Add containers to the game area
    card.appendChild(jumbledTextContainer);
    card.appendChild(typingOverlay);
    document.querySelector('.inner-box').appendChild(statsContainer);

    // Arena animation function
    function animateArena(targetWidth, targetHeight) {
        targetWidth = Math.max(minWidth, Math.min(targetWidth, maxWidth));
        targetHeight = Math.max(minHeight, Math.min(targetHeight, maxHeight));

        currentWidth = targetWidth;
        currentHeight = targetHeight;

        innerBox.style.width = `${currentWidth}px`;
        innerBox.style.height = `${currentHeight}px`;
    }

    // Function to handle arena shrinking based on inactivity
    function updateArenaSize() {
        const currentTime = Date.now();
        const inactiveDuration = (currentTime - lastActiveTime) / 1000;

        const shrinkProgress = Math.min(inactiveDuration / shrinkDuration, 1);
        
        const targetWidth = maxWidth - (maxWidth - minWidth) * shrinkProgress;
        const targetHeight = maxHeight - (maxHeight - minHeight) * shrinkProgress;

        animateArena(targetWidth, targetHeight);
    }

    // Function to calculate accuracy
    function calculateAccuracy(typed, target) {
        const typedWords = typed.trim().split(/\s+/);
        const targetWords = target.trim().split(/\s+/);
        
        let correctWords = 0;
        const minLength = Math.min(typedWords.length, targetWords.length);

        for (let i = 0; i < minLength; i++) {
            if (typedWords[i].toLowerCase() === targetWords[i].toLowerCase()) {
                correctWords++;
            }
        }

        return minLength > 0 ? (correctWords / targetWords.length) * 100 : 0;
    }

    // Function to calculate WPM and character metrics
    function calculateMetrics(startTime, endTime, targetSentence, typedText) {
        if (!startTime || !endTime) return { wpm: 0, accuracy: 0, correctChars: 0 };
        
        const testDuration = (endTime - startTime) / 60000; // minutes
        
        // Count correct characters
        let correctChars = 0;
        const minLength = Math.min(targetSentence.length, typedText.length);
        for (let i = 0; i < minLength; i++) {
            if (targetSentence[i].toLowerCase() === typedText[i].toLowerCase()) {
                correctChars++;
            }
        }

        // WPM calculation based on correct characters
        const wpm = Math.round((correctChars / 5) / testDuration);
        const accuracy = calculateAccuracy(typedText, targetSentence);
        const charsPerMin = Math.round(correctChars / testDuration);

        return { wpm, accuracy, correctChars, charsPerMin };
    }

    // Update statistics display
    function updateStatsDisplay() {
        document.getElementById('timer').textContent = `${timeRemaining}s`;
        document.getElementById('sentences').textContent = currentStats.totalSentences;
        
        const avgWPM = currentStats.totalSentences > 0 
            ? Math.round(currentStats.totalWPM / currentStats.totalSentences) 
            : 0;
        document.getElementById('wpm').textContent = avgWPM;
        
        const avgAccuracy = currentStats.totalSentences > 0 
            ? Math.round(currentStats.totalAccuracy / currentStats.totalSentences) 
            : 100;
        document.getElementById('accuracy').textContent = `${avgAccuracy}%`;
        
        document.getElementById('best-wpm').textContent = Math.round(currentStats.bestWPM);
        
        const avgCharsPerMin = currentStats.totalSentences > 0
            ? Math.round(currentStats.correctChars / (totalGameTime / 60))
            : 0;
        document.getElementById('chars-per-min').textContent = avgCharsPerMin;
    }

    // Game initialization
    async function initializeGame() {
        // Reset game state
        gameState = 'ready';
        timeRemaining = totalGameTime;
        startTime = null;
        endTime = null;
        currentStats = {
            totalSentences: 0,
            totalWPM: 0,
            totalAccuracy: 0,
            bestWPM: 0,
            worstWPM: Infinity,
            correctChars: 0,
            totalChars: 0
        };

        // Reset arena size
        currentWidth = maxWidth;
        currentHeight = maxHeight;
        innerBox.style.width = `${currentWidth}px`;
        innerBox.style.height = `${currentHeight}px`;
        lastActiveTime = Date.now();

        // Fetch first sentence
        const targetSentence = await fetchRandomSentence();
        const jumbledSentence = jumbleSentence(targetSentence);

        // Reset card and jumbled text
        card_p.textContent = '';
        card_p.contentEditable = 'true';
        jumbledText.textContent = jumbledSentence;
        typingText.textContent = '';

        // Update initial stats display
        updateStatsDisplay();

        // Start game timer
        gameTimer = setInterval(() => {
            timeRemaining--;
            updateArenaSize();
            updateStatsDisplay();

            if (timeRemaining <= 0) {
                endGame();
            }
        }, 1000);

        // Current sentence tracking
        let currentTargetSentence = targetSentence;

        // Enhanced input event listener
        card_p.addEventListener('input', async (e) => {
            lastActiveTime = Date.now();

            if (gameState === 'ready' && e.inputType !== 'removeContentBackward') {
                startTime = performance.now();
                gameState = 'typing';
            }

            // Update typing overlay to show correct/incorrect characters
            const typedText = card_p.textContent;
            const remainingText = currentTargetSentence.slice(typedText.length);
            
            // Highlight correct and incorrect characters
            let highlightedText = '';
            for (let i = 0; i < typedText.length; i++) {
                const isCorrect = typedText[i].toLowerCase() === currentTargetSentence[i].toLowerCase();
                highlightedText += `<span style="color: ${isCorrect ? 'green' : 'red'}">${typedText[i]}</span>`;
            }
            highlightedText += `<span style="color: rgba(0,0,0,0.2)">${remainingText}</span>`;
            
            typingText.innerHTML = highlightedText;

            // Check if sentence is complete
            if (gameState === 'typing' && card_p.textContent.trim().toLowerCase() === currentTargetSentence.trim().toLowerCase()) {
                // Calculate sentence metrics
                endTime = performance.now();
                const metrics = calculateMetrics(startTime, endTime, currentTargetSentence, card_p.textContent);

                // Grow the arena for correct sentence
                currentWidth = Math.min(maxWidth, currentWidth + growthPixels);
                currentHeight = Math.min(maxHeight, currentHeight + growthPixels);
                animateArena(currentWidth, currentHeight);

                // Update overall stats
                currentStats.totalSentences++;
                currentStats.totalWPM += metrics.wpm;
                currentStats.totalAccuracy += metrics.accuracy;
                currentStats.correctChars += metrics.correctChars;
                
                // Update best and worst WPM
                currentStats.bestWPM = Math.max(currentStats.bestWPM, metrics.wpm);
                currentStats.worstWPM = Math.min(currentStats.worstWPM, metrics.wpm);

                // Fetch and set up next sentence
                const nextTargetSentence = await fetchRandomSentence();
                const jumbledNextSentence = jumbleSentence(nextTargetSentence);

                // Reset card for next sentence
                card_p.textContent = '';
                jumbledText.textContent = jumbledNextSentence;
                typingText.textContent = '';
                currentTargetSentence = nextTargetSentence;
                
                // Update display
                updateStatsDisplay();

                // Reset start time for next sentence
                startTime = null;
                endTime = null;
            }
        });
    }

    // End game function
    function endGame() {
        clearInterval(gameTimer);
        card_p.contentEditable = 'false';
        gameState = 'done';

        // Show final stats
        card_p.innerHTML = `
            <div class="game-over-stats">
                <h2>Game Over!</h2>
                <p>Total Sentences: ${currentStats.totalSentences}</p>
                <p>Average WPM: ${Math.round(currentStats.totalWPM / Math.max(1, currentStats.totalSentences))}</p>
                <p>Average Accuracy: ${Math.round(currentStats.totalAccuracy / Math.max(1, currentStats.totalSentences))}%</p>
                <p>Best WPM: ${Math.round(currentStats.bestWPM)}</p>
            </div>
        `;

        // Restart game after 3 seconds
        setTimeout(initializeGame, 3000);
    }

    // Start the game
    initializeGame();
});