interface Cell {
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
}

type Board = Cell[][];

type GameOutcome = 'playing' | 'won' | 'lost';


function createBoard(
    width: number,
    height: number,
    mineCount: number,
    firstClickRow: number,
    firstClickCol: number,
): Board {
    const excluded = new Set<number>();
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const r = firstClickRow + dr;
            const c = firstClickCol + dc;
            if (r >= 0 && r < height && c >= 0 && c < width) {
                excluded.add(r * width + c);
            }
        }
    }

    const candidates: number[] = [];
    for (let i = 0; i < width * height; i++) {
        if (!excluded.has(i)) {
            candidates.push(i);
        }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const mineSet = new Set(candidates.slice(0, mineCount));

    const board: Board = [];
    for (let r = 0; r < height; r++) {
        const row: Cell[] = [];
        for (let c = 0; c < width; c++) {
            row.push({
                isMine: mineSet.has(r * width + c),
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0,
            });
        }
        board.push(row);
    }

    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            if (!board[r][c].isMine) {
                board[r][c].neighborMines = countNeighborMines(board, r, c);
            }
        }
    }

    return board;
}

function countNeighborMines(board: Board, row: number, col: number): number {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < board.length && c >= 0 && c < board[0].length) {
                if (board[r][c].isMine) count++;
            }
        }
    }
    return count;
}

function revealCell(board: Board, row: number, col: number): GameOutcome {
    const cell = board[row][col];
    if (cell.isFlagged || cell.isRevealed) return 'playing';

    if (cell.isMine) {
        cell.isRevealed = true;
        return 'lost';
    }

    const queue: Array<[number, number]> = [[row, col]];
    while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        const target = board[r][c];
        if (target.isRevealed || target.isFlagged) continue;
        target.isRevealed = true;

        if (target.neighborMines === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < board.length && nc >= 0 && nc < board[0].length) {
                        const neighbor = board[nr][nc];
                        if (!neighbor.isRevealed && !neighbor.isMine && !neighbor.isFlagged) {
                            queue.push([nr, nc]);
                        }
                    }
                }
            }
        }
    }

    return isWon(board) ? 'won' : 'playing';
}

function toggleFlag(board: Board, row: number, col: number): void {
    if (board[row][col].isRevealed) return;
    board[row][col].isFlagged = !board[row][col].isFlagged;
}

function isWon(board: Board): boolean {
    for (const row of board) {
        for (const cell of row) {
            if (!cell.isMine && !cell.isRevealed) return false;
        }
    }
    return true;
}

function countFlags(board: Board): number {
    let count = 0;
    for (const row of board) {
        for (const cell of row) {
            if (cell.isFlagged) count++;
        }
    }
    return count;
}

function revealAllMines(board: Board): void {
    for (const row of board) {
        for (const cell of row) {
            if (cell.isMine && !cell.isFlagged) cell.isRevealed = true;
        }
    }
}


export {
    Cell,
    Board,
    GameOutcome,
    createBoard,
    revealCell,
    toggleFlag,
    isWon,
    countFlags,
    revealAllMines,
};
