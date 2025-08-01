const boardElement = document.getElementById('board');
const resetButton = document.getElementById('reset');
const SIZE = 5;
const BOMB_COUNT = 5;
let board = [];
let gameOver = false;

function initBoard() {
    board = [];
    boardElement.innerHTML = '';
    gameOver = false;

    // Create board cells
    for (let r = 0; r < SIZE; r++) {
        const row = [];
        for (let c = 0; c < SIZE; c++) {
            const cell = {
                bomb: false,
                revealed: false,
                count: 0,
                element: document.createElement('div')
            };
            cell.element.className = 'cell';
            cell.element.addEventListener('click', () => onCellClick(r, c));
            boardElement.appendChild(cell.element);
            row.push(cell);
        }
        board.push(row);
    }

    // Place bombs
    let bombsPlaced = 0;
    while (bombsPlaced < BOMB_COUNT) {
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);
        if (!board[r][c].bomb) {
            board[r][c].bomb = true;
            bombsPlaced++;
        }
    }

    // Compute counts
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c].bomb) continue;
            board[r][c].count = countNeighbors(r, c);
        }
    }
}

function countNeighbors(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc].bomb) {
                count++;
            }
        }
    }
    return count;
}

function onCellClick(r, c) {
    if (gameOver) return;
    const cell = board[r][c];
    if (cell.revealed) return;

    cell.revealed = true;
    cell.element.classList.add('revealed');
    if (cell.bomb) {
        cell.element.classList.add('bomb');
        cell.element.textContent = '💣';
        endGame(false);
    } else {
        cell.element.textContent = cell.count || '';
        checkWin();
    }
}

function endGame(won) {
    gameOver = true;
    if (!won) {
        // reveal all bombs
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = board[r][c];
                if (cell.bomb) {
                    cell.element.classList.add('bomb');
                    cell.element.textContent = '💣';
                }
            }
        }
        alert('Game over!');
    } else {
        alert('You win!');
    }
}

function checkWin() {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = board[r][c];
            if (!cell.bomb && !cell.revealed) {
                return;
            }
        }
    }
    endGame(true);
}

resetButton.addEventListener('click', initBoard);
window.addEventListener('load', initBoard);
