let cards = [];
let currentCardIndex = 0;
let isFlipped = false;
let studyMode = false;
let correctAnswers = 0;
let totalAnswered = 0;
let studyQueue = [];
let wrongAnswers = [];
let isAnimating = false; // Prevent rapid navigation during animation
let studySettings = {
    shuffleCards: false,
    reviewIncorrect: true,
    autoAdvance: false,
    autoAdvanceDelay: 2000
};

// File upload handler
document.getElementById('fileInput').addEventListener('change', handleFileUpload);

// Keyboard navigation
document.addEventListener('keydown', handleKeyPress);

// Replace the existing handleKeyPress function with this updated version
function handleKeyPress(event) {
    if (cards.length === 0 || isAnimating) return;
    
    // Convert key to lowercase for case-insensitive comparison
    const key = event.key.toLowerCase();
    
    switch(key) {
        // Navigation - Left/Right arrows or A/D
        case 'arrowleft':
        case 'a':
            event.preventDefault();
            prevCard();
            break;
        case 'arrowright':
        case 'd':
            event.preventDefault();
            nextCard();
            break;
            
        // Card flipping - Up/Down arrows or W/S
        case 'arrowup':
        case 'w':
        case 'arrowdown':
        case 's':
            event.preventDefault();
            flipCard();
            break;
            
        // Legacy flip controls (keep for backward compatibility)
        case ' ':
        case 'enter':
            event.preventDefault();
            flipCard();
            break;
            
        // Study mode controls
        case 'q':
            if (studyMode && isFlipped) {
                event.preventDefault();
                handleAnswer(false); // Q for incorrect
            }
            break;
        case 'e':
            if (studyMode && isFlipped) {
                event.preventDefault();
                handleAnswer(true); // E for correct
            }
            break;
            
        // Legacy study mode controls (keep for backward compatibility)
        case '1':
            if (studyMode && isFlipped) {
                event.preventDefault();
                handleAnswer(false);
            }
            break;
        case '2':
            if (studyMode && isFlipped) {
                event.preventDefault();
                handleAnswer(true);
            }
            break;
            
        // Reset/Shuffle
        case 'r':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                if (studyMode) {
                    resetStudy();
                } else {
                    shuffleCards();
                }
            }
            break;
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            parseCardContent(content);
        };
        reader.readAsText(file);
    } else if (file) {
        showError('Please upload a .txt file');
    }
}

function parseCardContent(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const newCards = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Support multiple separators: tab, pipe, semicolon
        let front, back;
        if (line.includes('\t')) {
            [front, back] = line.split('\t');
        } else if (line.includes('|')) {
            [front, back] = line.split('|');
        } else if (line.includes(';')) {
            [front, back] = line.split(';');
        } else {
            // Try to split on double space or colon
            if (line.includes('  ')) {
                [front, back] = line.split('  ');
            } else if (line.includes(': ')) {
                [front, back] = line.split(': ');
            } else {
                showError(`Line ${i + 1}: Could not parse card format. Use TAB, |, ;, or : to separate front and back.`);
                continue;
            }
        }
        
        front = front?.trim();
        back = back?.trim();
        
        if (front && back) {
            newCards.push({
                id: i,
                front: front,
                back: back,
                difficulty: 0,
                correctCount: 0,
                incorrectCount: 0,
                lastReviewed: null
            });
        } else {
            showError(`Line ${i + 1}: Missing front or back content`);
        }
    }
    
    if (newCards.length === 0) {
        showError('No valid cards found. Please check your file format.');
        return;
    }
    
    cards = newCards;
    initializeCards();
}

function showError(message) {
    // Create temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 4000);
}

function initializeCards() {
    currentCardIndex = 0;
    isFlipped = false;
    studyMode = false;
    correctAnswers = 0;
    totalAnswered = 0;
    studyQueue = [...cards];
    wrongAnswers = [];
    
    // Hide upload section and show app
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'block';
    document.getElementById('flashcard').style.display = 'block';
    document.getElementById('navigation').style.display = 'block';
    
    updateStats();
    updateCard();
    updateNavigation();
    
    // Show success message
    showSuccess(`Successfully loaded ${cards.length} cards!`);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #22c55e;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function updateStats() {
    document.getElementById('cardCount').textContent = cards.length;
    document.getElementById('currentCard').textContent = currentCardIndex + 1;
    document.getElementById('totalCards').textContent = cards.length;
    
    if (studyMode) {
        document.getElementById('accuracyStats').style.display = 'block';
        const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
        document.getElementById('accuracy').textContent = accuracy + '%';
        document.getElementById('correctCount').textContent = correctAnswers;
        document.getElementById('totalAnswered').textContent = totalAnswered;
    } else {
        document.getElementById('accuracyStats').style.display = 'none';
    }
}

function updateCard() {
    if (cards.length === 0) return;
    
    const currentCard = cards[currentCardIndex];
    document.getElementById('cardContentFront').textContent = currentCard.front;
    document.getElementById('cardContentBack').textContent = currentCard.back;
    document.getElementById('cardHintFront').style.display = 'block';
    
    // Update card difficulty indicator
    updateCardDifficulty(currentCard);
}

function updateCardDifficulty(card) {
    // Remove existing difficulty indicators
    const existingIndicator = document.querySelector('.difficulty-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Add difficulty indicator based on performance
    if (card.correctCount > 0 || card.incorrectCount > 0) {
        const total = card.correctCount + card.incorrectCount;
        const accuracy = Math.round((card.correctCount / total) * 100);
        
        let difficultyClass = 'easy';
        if (accuracy < 50) difficultyClass = 'hard';
        else if (accuracy < 80) difficultyClass = 'medium';
        
        const indicator = document.createElement('div');
        indicator.className = `difficulty-indicator ${difficultyClass}`;
        indicator.textContent = `${accuracy}% (${card.correctCount}/${total})`;
        indicator.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            background: ${difficultyClass === 'easy' ? '#22c55e' : difficultyClass === 'medium' ? '#f59e0b' : '#ef4444'};
            color: white;
        `;
        document.querySelector('.card-front').appendChild(indicator);
    }
}

function updateNavigation() {
    document.getElementById('prevBtn').disabled = currentCardIndex === 0;
    document.getElementById('nextBtn').disabled = currentCardIndex === cards.length - 1;
    
    if (studyMode && isFlipped) {
        document.getElementById('studyControls').style.display = 'flex';
    } else {
        document.getElementById('studyControls').style.display = 'none';
    }
}

function flipCard() {
    if (cards.length === 0) return;
    
    const flashcard = document.getElementById('flashcard');
    isFlipped = !isFlipped;
    
    if (isFlipped) {
        flashcard.classList.add('flipped');
    } else {
        flashcard.classList.remove('flipped');
    }
    
    updateNavigation();
}

// Fixed navigation function - simplified and smoother
// Fixed navigation function - prevents answer flash
function navigateToCard(direction) {
    if (isAnimating) return;
    
    isAnimating = true;
    const flashcard = document.getElementById('flashcard');
    
    // IMPORTANT: Reset flip state BEFORE starting transition
    isFlipped = false;
    flashcard.classList.remove('flipped');
    
    // Simple fade transition
    flashcard.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    flashcard.style.opacity = '0';
    flashcard.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        // Update content while faded out
        updateCard();
        updateStats();
        updateNavigation();
        
        // Fade back in
        flashcard.style.opacity = '1';
        flashcard.style.transform = 'scale(1)';
        
        // Clean up
        setTimeout(() => {
            flashcard.style.transition = '';
            isAnimating = false;
        }, 200);
    }, 200);
}

function nextCard() {
    if (currentCardIndex < cards.length - 1 && !isAnimating) {
        currentCardIndex++;
        navigateToCard('next');
    }
}

function prevCard() {
    if (currentCardIndex > 0 && !isAnimating) {
        currentCardIndex--;
        navigateToCard('prev');
    }
}

function shuffleCards() {
    if (cards.length === 0) return;
    
    const flashcard = document.getElementById('flashcard');
    
    // First, ensure we're showing the front and reset flip state
    isFlipped = false;
    flashcard.classList.remove('flipped');
    
    // Small delay to ensure the flip animation completes before updating content
    setTimeout(() => {
        // Fisher-Yates shuffle algorithm
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        
        currentCardIndex = 0;
        updateCard();
        updateStats();
        updateNavigation();
        
        showSuccess('Cards shuffled!');
    }, 100);
}

function toggleStudyMode() {
    if (!studyMode) {
        startStudyMode();
    } else {
        resetStudy();
    }
}

function startStudyMode() {
    studyMode = true;
    currentCardIndex = 0;
    isFlipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    correctAnswers = 0;
    totalAnswered = 0;
    wrongAnswers = [];
    
    // Shuffle cards if setting is enabled
    if (studySettings.shuffleCards) {
        shuffleCards();
    }
    
    document.getElementById('studyModeBtn').innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1,4 1,10 7,10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        Reset Study
    `;
    document.getElementById('studyModeBtn').className = 'btn btn-secondary';
    
    updateCard();
    updateStats();
    updateNavigation();
    
    showSuccess('Study mode activated! Use keyboard: Space/Enter to flip, 1 for incorrect, 2 for correct');
}

function resetStudy() {
    studyMode = false;
    currentCardIndex = 0;
    isFlipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    correctAnswers = 0;
    totalAnswered = 0;
    wrongAnswers = [];
    
    document.getElementById('studyModeBtn').innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
        </svg>
        Study Mode
    `;
    document.getElementById('studyModeBtn').className = 'btn btn-primary';
    document.getElementById('completeSection').style.display = 'none';
    
    updateCard();
    updateStats();
    updateNavigation();
}

function handleAnswer(correct) {
    if (isAnimating) return;
    
    const currentCard = cards[currentCardIndex];
    
    if (correct) {
        correctAnswers++;
        currentCard.correctCount++;
        // Remove from wrong answers if it was there
        wrongAnswers = wrongAnswers.filter(card => card.id !== currentCard.id);
    } else {
        currentCard.incorrectCount++;
        // Add to wrong answers for review
        if (!wrongAnswers.find(card => card.id === currentCard.id)) {
            wrongAnswers.push(currentCard);
        }
    }
    
    totalAnswered++;
    currentCard.lastReviewed = Date.now();
    
    updateStats();
    
    // Visual feedback
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.add(correct ? 'correct-answer' : 'incorrect-answer');
    
    setTimeout(() => {
        flashcard.classList.remove('correct-answer', 'incorrect-answer');
    }, 1000);
    
    // Auto advance with smooth transition
    const advanceDelay = studySettings.autoAdvance ? studySettings.autoAdvanceDelay : 1000;
    
    setTimeout(() => {
        if (currentCardIndex < cards.length - 1) {
            currentCardIndex++;
            navigateToCard('next');
        } else {
            // End of deck - check if we should review incorrect answers
            if (studySettings.reviewIncorrect && wrongAnswers.length > 0) {
                startIncorrectReview();
            } else {
                showComplete();
            }
        }
    }, advanceDelay);
}

function startIncorrectReview() {
    // Switch to reviewing only incorrect answers
    cards = [...wrongAnswers];
    currentCardIndex = 0;
    isFlipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    updateCard();
    updateStats();
    updateNavigation();
    
    showSuccess(`Reviewing ${wrongAnswers.length} incorrect cards`);
}

function showComplete() {
    const accuracy = Math.round((correctAnswers / totalAnswered) * 100);
    const grade = getGrade(accuracy);
    
    document.getElementById('finalScore').innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px;">${grade}</div>
        <div>Final Score: ${correctAnswers}/${totalAnswered} (${accuracy}%)</div>
        <div style="margin-top: 10px; font-size: 14px; color: #666;">
            ${wrongAnswers.length} cards need more review
        </div>
    `;
    document.getElementById('completeSection').style.display = 'block';
    
    // Save study session data
    saveStudySession({
        date: new Date(),
        totalCards: cards.length,
        correct: correctAnswers,
        incorrect: totalAnswered - correctAnswers,
        accuracy: accuracy,
        grade: grade
    });
}

function getGrade(accuracy) {
    if (accuracy >= 95) return 'A+';
    if (accuracy >= 90) return 'A';
    if (accuracy >= 85) return 'A-';
    if (accuracy >= 80) return 'B+';
    if (accuracy >= 75) return 'B';
    if (accuracy >= 70) return 'B-';
    if (accuracy >= 65) return 'C+';
    if (accuracy >= 60) return 'C';
    if (accuracy >= 55) return 'C-';
    if (accuracy >= 50) return 'D';
    return 'F';
}

function saveStudySession(session) {
    // Save to memory (since localStorage is not available)
    if (!window.studySessions) {
        window.studySessions = [];
    }
    window.studySessions.push(session);
    
    // Keep only last 50 sessions
    if (window.studySessions.length > 50) {
        window.studySessions = window.studySessions.slice(-50);
    }
}

function getStudySessionStats() {
    if (!window.studySessions || window.studySessions.length === 0) {
        return null;
    }
    
    const sessions = window.studySessions;
    const totalSessions = sessions.length;
    const avgAccuracy = sessions.reduce((sum, session) => sum + session.accuracy, 0) / totalSessions;
    const bestAccuracy = Math.max(...sessions.map(s => s.accuracy));
    const recentSessions = sessions.slice(-5);
    const recentAvg = recentSessions.reduce((sum, session) => sum + session.accuracy, 0) / recentSessions.length;
    
    return {
        totalSessions,
        avgAccuracy: Math.round(avgAccuracy),
        bestAccuracy,
        recentAvg: Math.round(recentAvg),
        improvement: recentAvg - avgAccuracy
    };
}

// Progress tracking functions
function getDifficultCards() {
    return cards.filter(card => {
        const total = card.correctCount + card.incorrectCount;
        if (total < 3) return false; // Need at least 3 attempts
        const accuracy = card.correctCount / total;
        return accuracy < 0.6; // Less than 60% accuracy
    }).sort((a, b) => {
        const aAccuracy = a.correctCount / (a.correctCount + a.incorrectCount);
        const bAccuracy = b.correctCount / (b.correctCount + b.incorrectCount);
        return aAccuracy - bAccuracy;
    });
}

function getMasteredCards() {
    return cards.filter(card => {
        const total = card.correctCount + card.incorrectCount;
        if (total < 5) return false; // Need at least 5 attempts
        const accuracy = card.correctCount / total;
        return accuracy >= 0.9; // 90% or higher accuracy
    });
}

// Export functions for external use
window.flashcardApp = {
    shuffleCards,
    getDifficultCards,
    getMasteredCards,
    getStudySessionStats,
    studySettings
};