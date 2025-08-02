export default class Board {
  constructor(size, bombCount, rng = Math.random, bombPositions = null) {
    this.size = size;
    this.bombCount = bombCount;
    this.cells = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        row.push({ bomb: false, revealed: false, count: 0 });
      }
      this.cells.push(row);
    }

    if (bombPositions) {
      for (const [r, c] of bombPositions) {
        this.cells[r][c].bomb = true;
      }
    } else {
      let placed = 0;
      while (placed < bombCount) {
        const r = Math.floor(rng() * size);
        const c = Math.floor(rng() * size);
        const cell = this.cells[r][c];
        if (!cell.bomb) {
          cell.bomb = true;
          placed++;
        }
      }
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (this.cells[r][c].bomb) continue;
        this.cells[r][c].count = this.countNeighbors(r, c);
      }
    }
  }

  countNeighbors(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.cells[nr][nc].bomb) {
          count++;
        }
      }
    }
    return count;
  }

  reveal(r, c) {
    const cell = this.cells[r][c];
    if (cell.revealed) return cell;
    cell.revealed = true;
    return cell;
  }

  revealAllBombs() {
    this.forEachCell(cell => {
      if (cell.bomb) cell.revealed = true;
    });
  }

  checkWin() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = this.cells[r][c];
        if (!cell.bomb && !cell.revealed) {
          return false;
        }
      }
    }
    return true;
  }

  forEachCell(fn) {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        fn(this.cells[r][c], r, c);
      }
    }
  }
}
