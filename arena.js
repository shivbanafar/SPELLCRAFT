document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements first
    const innerBox = document.querySelector('.inner-box');
    const outerBox = document.querySelector('.outer-box');
    const card = document.querySelector('.card');
    const card_p = card.querySelector('p');

    // Fetch a random sentence from the server
    let targetSentence = "";
    try {
        const response = await fetch('http://localhost:3000/random-sentence');
        const data = await response.json();
        targetSentence = data.sentence || "Default fallback sentence";
    } catch (error) {
        console.error('Failed to fetch random sentence:', error);
        targetSentence = "Default fallback sentence";
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

    // Jumbled sentence
    const jumbledSentence = jumbleSentence(targetSentence);

    // Create stats display elements
    const statsContainer = document.createElement('div');
    statsContainer.style.position = 'absolute';
    statsContainer.style.top = '10px';
    statsContainer.style.left = '10px';
    statsContainer.style.backgroundColor = 'rgba(255,255,255,0.7)';
    statsContainer.style.padding = '5px';
    statsContainer.style.borderRadius = '5px';
    statsContainer.style.fontWeight = 'bold';
    statsContainer.style.display = 'flex';
    statsContainer.style.flexDirection = 'column';
    
    const timerDisplay = document.createElement('div');
    const statsDisplay = document.createElement('div');
    
    statsContainer.appendChild(timerDisplay);
    statsContainer.appendChild(statsDisplay);
    
    innerBox.style.position = 'relative';
    innerBox.appendChild(statsContainer);

    // Game state variables
    let startTime = null;
    let endTime = null;
    let gameState = 'ready'; // 'ready', 'typing', 'done'
    let gameTimer = null;
    let timeRemaining = 5; // 5-second typing window

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

    // Function to calculate WPM (MonkeyType-like)
    function calculateWPM() {
        if (!startTime || !endTime) return 0;
        
        const typedText = card_p.textContent.trim();
        const correctChars = targetSentence.split('').filter((char, index) => 
            char.toLowerCase() === typedText.charAt(index)?.toLowerCase()
        ).length;
        
        // Calculate time in minutes
        const testDuration = (endTime - startTime) / 60000;
        
        // WPM calculation based on correct characters, assuming average word length of 5
        return Math.round((correctChars / 5) / testDuration);
    }

    // Update timer display
    function updateTimerDisplay() {
        if (gameState === 'typing') {
            timerDisplay.textContent = `Time left: ${timeRemaining}s`;
        } else {
            timerDisplay.textContent = '';
        }
    }

    // Start typing phase
    function startTyping() {
        if (gameState !== 'ready') return;

        gameState = 'typing';
        timeRemaining = 5;
        startTime = performance.now();

        updateTimerDisplay();

        gameTimer = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();

            if (timeRemaining <= 0) {
                endTyping();
            }
        }, 1000);
    }

    // End typing phase
    function endTyping() {
        if (gameState !== 'typing') return;

        clearInterval(gameTimer);
        endTime = performance.now();
        gameState = 'done';
        
        // Disable editing
        card_p.contentEditable = 'false';
        
        // Calculate and display results
        const wpm = calculateWPM();
        const accuracy = calculateAccuracy(card_p.textContent, targetSentence);
        
        // Update stats display
        statsDisplay.textContent = `WPM: ${wpm} | Accuracy: ${Math.round(accuracy)}%`;
        
        // Optional: Reset for next attempt
        setTimeout(() => {
            gameState = 'ready';
            card_p.contentEditable = 'true';
            card_p.textContent = '';
            card_p.setAttribute('placeholder', `Get ready to type: "${jumbleSentence(targetSentence)}"`);
        }, 3000);
    }

    // Input event listener to track typing and start game
    card_p.addEventListener('input', (e) => {
        if (gameState === 'ready' && e.inputType !== 'removeContentBackward') {
            startTyping();
        }
    });

    // Set initial placeholder
    card_p.setAttribute('placeholder', `Get ready to type: "${jumbledSentence}"`);

    // Log the jumbled sentence for reference
    console.log('Jumbled Sentence:', jumbledSentence);
    console.log('Original Sentence:', targetSentence);

    // Rest of the arena animation code remains the same
    let maxWidth = outerBox.offsetWidth - 40;
    let maxHeight = outerBox.offsetHeight - 40;
    const minWidth = card.offsetWidth + 40;
    const minHeight = card.offsetHeight + 40;

    const animationDuration = 1000;
    let currentAnimation = null;

    function animateArena(targetWidth, targetHeight) {
        if (currentAnimation) {
            cancelAnimationFrame(currentAnimation);
        }

        const startWidth = innerBox.offsetWidth;
        const startHeight = innerBox.offsetHeight;
        const startTime = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            const newWidth = startWidth + (targetWidth - startWidth) * easeProgress;
            const newHeight = startHeight + (targetHeight - startHeight) * easeProgress;

            innerBox.style.width = `${Math.max(minWidth, Math.min(newWidth, maxWidth))}px`;
            innerBox.style.height = `${Math.max(minHeight, Math.min(newHeight, maxHeight))}px`;

            if (progress < 1) {
                currentAnimation = requestAnimationFrame(animate);
            }
        }

        currentAnimation = requestAnimationFrame(animate);
    }

    // Initialize arena to full size
    innerBox.style.width = `${maxWidth}px`;
    innerBox.style.height = `${maxHeight}px`;

    // Listen for keystrokes for arena animation
    document.addEventListener('keydown', (event) => {
        const currentWidth = innerBox.offsetWidth;
        const currentHeight = innerBox.offsetHeight;

        if (event.key === ' ') {
            // Shrink on spacebar
            const targetWidth = maxWidth - (maxWidth - minWidth) * 0.5;
            const targetHeight = maxHeight - (maxHeight - minHeight) * 0.5;
            animateArena(targetWidth, targetHeight);
        } else {
            // Grow on any other key
            const targetWidth = Math.min(maxWidth, currentWidth * 1.25);
            const targetHeight = Math.min(maxHeight, currentHeight * 1.25);
            animateArena(targetWidth, targetHeight);
        }
    });
});