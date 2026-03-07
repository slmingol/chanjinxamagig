// Puzzle database
const PUZZLES = [
    {
        start: "SAVE",
        end: "PLAN",
        solution: ["SAVE", "SAGE", "PAGE", "PALE", "PALS", "PLAN"],
        clues: [
            "Change one letter in SAVE to get a wise person",
            "A sheet of paper",
            "Not dark or colorful",
            "Plural of a close friend",
            "What you SAVE for the future",
            "A scheme or strategy"
        ],
        theme: "Word Transformations",
        date: "March 7, 2026"
    },
    {
        start: "COLD",
        end: "WARM",
        solution: ["COLD", "CORD", "WORD", "WORM", "WARM"],
        clues: [
            "Opposite of hot",
            "A rope or cable",
            "What you're reading now",
            "Wiggly invertebrate",
            "Cozy and comfortable temperature"
        ],
        theme: "Temperature",
        date: "March 7, 2026"
    },
    {
        start: "HEAD",
        end: "TAIL",
        solution: ["HEAD", "HEAL", "TEAL", "TELL", "TALL", "TAIL"],
        clues: [
            "Top of your body",
            "To cure or repair",
            "A blue-green color",
            "To speak or narrate",
            "Having great height",
            "The opposite end from HEAD"
        ],
        theme: "Opposites",
        date: "March 7, 2026"
    },
    {
        start: "WORK",
        end: "PLAY",
        solution: ["WORK", "PORK", "PORT", "POST", "PAST", "PLAT", "PLAY"],
        clues: [
            "What you do for a living",
            "Meat from a pig",
            "A harbor for ships",
            "Where you mail letters",
            "The opposite of future",
            "A measured piece of land",
            "To have fun"
        ],
        theme: "Life Balance",
        date: "March 7, 2026"
    },
    {
        start: "LOVE",
        end: "HATE",
        solution: ["LOVE", "HOVE", "HAVE", "HATE"],
        clues: [
            "A deep affection",
            "Past tense of heave (nautical)",
            "To possess something",
            "Strong dislike"
        ],
        theme: "Emotions",
        date: "March 7, 2026"
    },
    {
        start: "FAST",
        end: "SLOW",
        solution: ["FAST", "LAST", "LASH", "LATH", "LOATH", "SLOTH", "SLOE", "SLOW"],
        clues: [
            "Quick or speedy",
            "Coming after all others",
            "To whip or strike",
            "A thin strip of wood",
            "Reluctant or unwilling",
            "A very slow-moving animal",
            "A type of berry",
            "Not fast"
        ],
        theme: "Speed",
        date: "March 7, 2026"
    }
];

// Game state
let currentPuzzle = null;
let currentPuzzleIndex = 0;
let userSolution = [];

// Elements
const startWordEl = document.getElementById('start-word');
const endWordEl = document.getElementById('end-word');
const puzzleDateEl = document.getElementById('puzzle-date');
const puzzleThemeEl = document.getElementById('puzzle-theme');
const ladderEl = document.getElementById('ladder');
const cluesEl = document.getElementById('clues');
const checkBtn = document.getElementById('check-btn');
const revealBtn = document.getElementById('reveal-btn');
const newPuzzleBtn = document.getElementById('new-puzzle-btn');
const clearBtn = document.getElementById('clear-btn');
const resultModal = document.getElementById('result-modal');
const resultMessage = document.getElementById('result-message');
const closeModal = document.querySelector('.close');

// Initialize game
function initGame() {
    loadPuzzle(currentPuzzleIndex);
}

// Load a puzzle
function loadPuzzle(index) {
    currentPuzzle = PUZZLES[index % PUZZLES.length];
    currentPuzzleIndex = index;
    userSolution = new Array(currentPuzzle.solution.length).fill('');
    userSolution[0] = currentPuzzle.start;
    userSolution[userSolution.length - 1] = currentPuzzle.end;
    
    renderPuzzle();
}

// Render the puzzle
function renderPuzzle() {
    // Update header
    startWordEl.textContent = currentPuzzle.start;
    endWordEl.textContent = currentPuzzle.end;
    puzzleDateEl.textContent = currentPuzzle.date;
    puzzleThemeEl.textContent = `Theme: ${currentPuzzle.theme}`;
    
    // Render ladder
    renderLadder();
    
    // Render clues (shuffled)
    renderClues();
}

// Render ladder steps
function renderLadder() {
    ladderEl.innerHTML = '';
    
    currentPuzzle.solution.forEach((word, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'ladder-step';
        
        const stepNumber = document.createElement('div');
        stepNumber.className = 'step-number';
        stepNumber.textContent = index + 1;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'step-input';
        input.maxLength = word.length;
        input.dataset.index = index;
        
        // First and last are disabled
        if (index === 0 || index === currentPuzzle.solution.length - 1) {
            input.value = word;
            input.disabled = true;
        } else {
            input.value = userSolution[index] || '';
            input.addEventListener('input', handleInput);
            input.addEventListener('keydown', handleKeyDown);
        }
        
        const hintSpan = document.createElement('span');
        hintSpan.className = 'step-hint';
        
        stepDiv.appendChild(stepNumber);
        stepDiv.appendChild(input);
        stepDiv.appendChild(hintSpan);
        ladderEl.appendChild(stepDiv);
    });
}

// Render clues (shuffled)
function renderClues() {
    cluesEl.innerHTML = '';
    
    // Shuffle clues
    const shuffledClues = [...currentPuzzle.clues].sort(() => Math.random() - 0.5);
    
    shuffledClues.forEach(clue => {
        const clueDiv = document.createElement('div');
        clueDiv.className = 'clue';
        clueDiv.textContent = clue;
        cluesEl.appendChild(clueDiv);
    });
}

// Handle input
function handleInput(e) {
    const index = parseInt(e.target.dataset.index);
    userSolution[index] = e.target.value.toUpperCase();
    e.target.value = e.target.value.toUpperCase();
}

// Handle keyboard navigation
function handleKeyDown(e) {
    const index = parseInt(e.target.dataset.index);
    
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextInput = document.querySelector(`input[data-index="${index + 1}"]`);
        if (nextInput && !nextInput.disabled) {
            nextInput.focus();
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevInput = document.querySelector(`input[data-index="${index - 1}"]`);
        if (prevInput && !prevInput.disabled) {
            prevInput.focus();
        }
    }
}

// Check if two words differ by exactly one letter
function differsByOneLetter(word1, word2) {
    if (word1.length !== word2.length) return false;
    
    let differences = 0;
    for (let i = 0; i < word1.length; i++) {
        if (word1[i] !== word2[i]) differences++;
    }
    
    return differences === 1;
}

// Check solution
function checkSolution() {
    let allCorrect = true;
    const inputs = document.querySelectorAll('.step-input:not(:disabled)');
    
    inputs.forEach(input => {
        const index = parseInt(input.dataset.index);
        const userWord = userSolution[index];
        const correctWord = currentPuzzle.solution[index];
        const prevWord = userSolution[index - 1];
        const nextWord = userSolution[index + 1];
        
        input.classList.remove('correct', 'incorrect');
        const hintEl = input.nextElementSibling;
        hintEl.textContent = '';
        
        if (!userWord) {
            allCorrect = false;
            return;
        }
        
        // Check if it differs by one letter from previous
        if (!differsByOneLetter(userWord, prevWord)) {
            input.classList.add('incorrect');
            hintEl.textContent = 'Must differ by 1 letter from above';
            allCorrect = false;
            return;
        }
        
        // Check if matches correct answer
        if (userWord === correctWord) {
            input.classList.add('correct');
        } else {
            input.classList.add('incorrect');
            hintEl.textContent = 'Incorrect word';
            allCorrect = false;
        }
    });
    
    if (allCorrect) {
        showResult(true);
    } else {
        showResult(false);
    }
}

// Reveal answer
function revealAnswer() {
    const inputs = document.querySelectorAll('.step-input');
    
    inputs.forEach((input, index) => {
        if (!input.disabled) {
            input.value = currentPuzzle.solution[index];
            userSolution[index] = currentPuzzle.solution[index];
            input.classList.add('correct');
            input.disabled = true;
        }
    });
}

// Show result modal
function showResult(success) {
    if (success) {
        resultMessage.innerHTML = `
            <span class="emoji">🎉</span>
            <strong>Congratulations!</strong><br>
            You solved the puzzle!
        `;
    } else {
        resultMessage.innerHTML = `
            <span class="emoji">💭</span>
            <strong>Not quite right...</strong><br>
            Keep trying or reveal the answer!
        `;
    }
    
    resultModal.style.display = 'block';
}

// Clear all inputs
function clearAll() {
    const inputs = document.querySelectorAll('.step-input:not(:disabled)');
    inputs.forEach((input, index) => {
        input.value = '';
        const dataIndex = parseInt(input.dataset.index);
        userSolution[dataIndex] = '';
        input.classList.remove('correct', 'incorrect');
        input.nextElementSibling.textContent = '';
    });
}

// New puzzle
function newPuzzle() {
    currentPuzzleIndex = (currentPuzzleIndex + 1) % PUZZLES.length;
    loadPuzzle(currentPuzzleIndex);
}

// Event listeners
checkBtn.addEventListener('click', checkSolution);
revealBtn.addEventListener('click', revealAnswer);
newPuzzleBtn.addEventListener('click', newPuzzle);
clearBtn.addEventListener('click', clearAll);
closeModal.addEventListener('click', () => {
    resultModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === resultModal) {
        resultModal.style.display = 'none';
    }
});

// Start the game
initGame();
