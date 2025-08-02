import Board from './board.js';

const SIZE = 5;
const BOMBS = 5;
const TILE_SIZE = 32;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('reset');
const tilesImg = new Image();
tilesImg.src = 'tiles.png';
let board;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  board.forEachCell((cell, r, c) => {
    let sx = 0;
    if (cell.revealed) {
      sx = cell.bomb ? TILE_SIZE * 2 : TILE_SIZE;
    }
    ctx.drawImage(tilesImg, sx, 0, TILE_SIZE, TILE_SIZE, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    if (cell.revealed && !cell.bomb && cell.count > 0) {
      ctx.fillStyle = 'black';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(cell.count), c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2);
    }
  });
}

function reset() {
  board = new Board(SIZE, BOMBS);
  draw();
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor(x / TILE_SIZE);
  const r = Math.floor(y / TILE_SIZE);
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
  const cell = board.reveal(r, c);
  draw();
  if (cell.bomb) {
    board.revealAllBombs();
    draw();
    setTimeout(() => alert('Game over!'), 0);
  } else if (board.checkWin()) {
    setTimeout(() => alert('You win!'), 0);
  }
});

resetBtn.addEventListener('click', reset);
tilesImg.onload = reset;
