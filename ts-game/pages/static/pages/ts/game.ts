import { api, LeaderboardEntry, Level } from './api';
import {
    Board,
    GameOutcome,
    countFlags,
    createBoard,
    revealAllMines,
    revealCell,
    toggleFlag,
} from './board';
import { formatTime } from './format';


type Phase = 'idle' | GameOutcome;


function startGame(
    container: HTMLElement,
    level: Level,
    onExit: () => void,
): void {
    let board: Board | null = null;
    let phase: Phase = 'idle';
    let startTime = 0;
    let elapsedMs = 0;
    let timerHandle: ReturnType<typeof setInterval> | null = null;
    let eventSource: EventSource | null = null;

    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'game-header';

    const title = document.createElement('h1');
    title.textContent = level.name;

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.textContent = '← Lobby';
    backBtn.addEventListener('click', exit);

    header.append(title, backBtn);

    const hud = document.createElement('div');
    hud.className = 'game-hud';
    const minesEl = document.createElement('span');
    const timerEl = document.createElement('span');
    hud.append(minesEl, timerEl);

    const boardEl = document.createElement('div');
    boardEl.className = 'minesweeper-board';
    boardEl.style.gridTemplateColumns = `repeat(${level.width}, 30px)`;

    const leaderboardEl = document.createElement('section');
    leaderboardEl.className = 'leaderboard';
    renderLeaderboardLoading(leaderboardEl);

    const resultEl = document.createElement('div');
    resultEl.className = 'game-result';

    container.append(header, hud, boardEl, leaderboardEl, resultEl);

    boardEl.addEventListener('click', handleClick);
    boardEl.addEventListener('contextmenu', handleContextMenu);

    renderBlankBoard();
    updateHud();
    openLeaderboardStream();

    function renderBlankBoard(): void {
        boardEl.innerHTML = '';
        for (let r = 0; r < level.height; r++) {
            for (let c = 0; c < level.width; c++) {
                const cellBtn = document.createElement('button');
                cellBtn.type = 'button';
                cellBtn.className = 'cell hidden';
                cellBtn.dataset.row = String(r);
                cellBtn.dataset.col = String(c);
                boardEl.appendChild(cellBtn);
            }
        }
    }

    function renderBoard(): void {
        if (board === null) return;
        for (let r = 0; r < level.height; r++) {
            for (let c = 0; c < level.width; c++) {
                const cellBtn = boardEl.children[r * level.width + c] as HTMLButtonElement;
                const cell = board[r][c];

                const newClasses: string[] = ['cell'];
                let newText = '';

                if (cell.isFlagged && !cell.isRevealed) {
                    newClasses.push('flagged');
                    newText = '⚑';
                } else if (!cell.isRevealed) {
                    newClasses.push('hidden');
                } else if (cell.isMine) {
                    newClasses.push('mine');
                    newText = '●';
                } else {
                    newClasses.push('revealed');
                    if (cell.neighborMines > 0) {
                        newText = String(cell.neighborMines);
                        newClasses.push(`n${cell.neighborMines}`);
                    }
                }

                const newClassName = newClasses.join(' ');
                if (cellBtn.className !== newClassName) {
                    cellBtn.className = newClassName;
                }
                if (cellBtn.textContent !== newText) {
                    cellBtn.textContent = newText;
                }
            }
        }
    }

    function markEndState(): void {
        if (board === null) return;
        for (let r = 0; r < level.height; r++) {
            for (let c = 0; c < level.width; c++) {
                const cell = board[r][c];
                if (!cell.isFlagged) continue;
                const cellBtn = boardEl.children[r * level.width + c] as HTMLButtonElement;
                if (cell.isMine) {
                    cellBtn.classList.add('flagged-correct');
                } else {
                    cellBtn.classList.add('flagged-wrong');
                    cellBtn.textContent = '✗';
                }
            }
        }
    }

    function updateHud(): void {
        const flags = board !== null ? countFlags(board) : 0;
        minesEl.textContent = `Mines: ${level.mine_count - flags}`;
        timerEl.textContent = `Time: ${formatTime(elapsedMs)}`;
    }

    function startTimer(): void {
        startTime = performance.now();
        timerHandle = setInterval(() => {
            elapsedMs = performance.now() - startTime;
            updateHud();
        }, 100);
    }

    function stopTimer(): void {
        if (timerHandle !== null) {
            clearInterval(timerHandle);
            timerHandle = null;
        }
    }

    function openLeaderboardStream(): void {
        eventSource = new EventSource(`/api/levels/${level.id}/stream/`);
        eventSource.onmessage = (event: MessageEvent) => {
            try {
                const entries: LeaderboardEntry[] = JSON.parse(event.data);
                renderLeaderboard(leaderboardEl, entries);
            } catch {
                // malformed event; skip it
            }
        };
    }

    function closeLeaderboardStream(): void {
        if (eventSource !== null) {
            eventSource.close();
            eventSource = null;
        }
    }

    function exit(): void {
        stopTimer();
        closeLeaderboardStream();
        onExit();
    }

    function restart(): void {
        stopTimer();
        closeLeaderboardStream();
        startGame(container, level, onExit);
    }

    function cellCoords(target: EventTarget | null): [number, number] | null {
        if (!(target instanceof HTMLElement)) return null;
        if (!target.classList.contains('cell')) return null;
        const row = Number(target.dataset.row);
        const col = Number(target.dataset.col);
        if (Number.isNaN(row) || Number.isNaN(col)) return null;
        return [row, col];
    }

    function handleClick(event: MouseEvent): void {
        if (phase === 'won' || phase === 'lost') return;

        const coords = cellCoords(event.target);
        if (coords === null) return;
        const [row, col] = coords;

        if (phase === 'idle') {
            board = createBoard(level.width, level.height, level.mine_count, row, col);
            phase = 'playing';
            startTimer();
        }

        const outcome = revealCell(board!, row, col);
        phase = outcome;
        renderBoard();
        updateHud();

        if (outcome === 'won') {
            handleWin();
        } else if (outcome === 'lost') {
            handleLose();
        }
    }

    function handleContextMenu(event: MouseEvent): void {
        event.preventDefault();
        if (phase !== 'playing') return;

        const coords = cellCoords(event.target);
        if (coords === null) return;
        const [row, col] = coords;

        toggleFlag(board!, row, col);
        renderBoard();
        updateHud();
    }

    async function handleWin(): Promise<void> {
        stopTimer();
        const finalMs = Math.round(elapsedMs);
        elapsedMs = finalMs;
        updateHud();

        const submitResult = await api.createScore({ level: level.id, time_ms: finalMs });

        resultEl.innerHTML = '';
        const heading = document.createElement('h2');
        heading.textContent = `You won in ${formatTime(finalMs)}!`;
        resultEl.appendChild(heading);

        if (submitResult.ok && submitResult.data.rank !== null) {
            const rankEl = document.createElement('p');
            rankEl.className = 'rank';
            rankEl.textContent = `That's the #${submitResult.data.rank} best time on this level!`;
            resultEl.appendChild(rankEl);
        } else if (!submitResult.ok) {
            const errEl = document.createElement('p');
            errEl.className = 'error';
            errEl.textContent = `Couldn't save score: ${submitResult.error}`;
            resultEl.appendChild(errEl);
        }

        resultEl.appendChild(renderResultButtons());
    }

    function handleLose(): void {
        stopTimer();
        if (board !== null) {
            revealAllMines(board);
            renderBoard();
            markEndState();
        }

        resultEl.innerHTML = '';
        const heading = document.createElement('h2');
        heading.textContent = `You hit a mine after ${formatTime(elapsedMs)}.`;
        resultEl.appendChild(heading);
        resultEl.appendChild(renderResultButtons());
    }

    function renderResultButtons(): HTMLElement {
        const row = document.createElement('div');
        row.className = 'result-buttons';

        const playAgain = document.createElement('button');
        playAgain.type = 'button';
        playAgain.textContent = 'Play again';
        playAgain.addEventListener('click', restart);

        const backToLobby = document.createElement('button');
        backToLobby.type = 'button';
        backToLobby.textContent = 'Back to lobby';
        backToLobby.addEventListener('click', exit);

        row.append(playAgain, backToLobby);
        return row;
    }
}


function renderLeaderboardLoading(container: HTMLElement): void {
    container.innerHTML = '';
    const heading = document.createElement('h3');
    heading.textContent = 'Top 5';
    const p = document.createElement('p');
    p.textContent = 'Connecting…';
    container.append(heading, p);
}


function renderLeaderboard(container: HTMLElement, entries: LeaderboardEntry[]): void {
    container.innerHTML = '';

    const heading = document.createElement('h3');
    heading.textContent = 'Top 5';
    container.appendChild(heading);

    if (entries.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = 'No times yet.';
        container.appendChild(empty);
        return;
    }

    const list = document.createElement('ol');
    for (const entry of entries) {
        const li = document.createElement('li');
        li.textContent = `${entry.username}: ${formatTime(entry.time_ms)}`;
        list.appendChild(li);
    }
    container.appendChild(list);
}


export { startGame };
