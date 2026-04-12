import { api, Level } from './api';
import { formatTime } from './format';


const PREFS_KEY = 'minesweeper-prefs';


interface PersistedPrefs {
    lastLevelId: number;
}


function isPersistedPrefs(data: unknown): data is PersistedPrefs {
    if (typeof data !== 'object' || data === null) return false;
    const record = data as Record<string, unknown>;
    return typeof record.lastLevelId === 'number';
}


function loadPrefs(): PersistedPrefs | null {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw === null) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        return isPersistedPrefs(parsed) ? parsed : null;
    } catch {
        return null;
    }
}


function savePrefs(prefs: PersistedPrefs): void {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}


async function renderLobby(
    container: HTMLElement,
    onLevelSelected: (level: Level) => void,
): Promise<void> {
    container.textContent = 'Loading…';

    const result = await api.getLevels();
    if (!result.ok) {
        container.textContent = `Error: ${result.error}`;
        return;
    }

    const lastLevelId = loadPrefs()?.lastLevelId ?? null;

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'level-grid';
    for (const level of result.data) {
        grid.appendChild(renderLevelCard(
            level,
            (selected) => {
                savePrefs({ lastLevelId: selected.id });
                onLevelSelected(selected);
            },
            lastLevelId === level.id,
        ));
    }
    container.appendChild(grid);
}


function renderLevelCard(
    level: Level,
    onLevelSelected: (level: Level) => void,
    isLastPlayed: boolean,
): HTMLElement {
    const article = document.createElement('article');
    article.className = 'level-card';
    article.dataset.levelId = String(level.id);
    if (!level.unlocked) {
        article.classList.add('locked');
    }

    const heading = document.createElement('h2');
    heading.textContent = level.name;
    if (isLastPlayed && level.unlocked) {
        const badge = document.createElement('span');
        badge.className = 'last-played-badge';
        badge.textContent = 'Last played';
        heading.append(' ', badge);
    }

    const dims = document.createElement('p');
    dims.textContent = `${level.width} × ${level.height}, ${level.mine_count} mines`;

    const best = document.createElement('p');
    best.className = 'personal-best';
    best.textContent = level.personal_best_ms !== null
        ? `Personal best: ${formatTime(level.personal_best_ms)}`
        : 'No record yet.';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'play-btn';
    if (level.unlocked) {
        playBtn.textContent = 'Play';
        playBtn.addEventListener('click', () => onLevelSelected(level));
    } else {
        playBtn.textContent = 'Locked';
        playBtn.disabled = true;
    }

    article.append(heading, dims, best);
    if (!level.unlocked) {
        const lockMsg = document.createElement('p');
        lockMsg.className = 'lock-msg';
        lockMsg.textContent = `Clear Level ${level.id - 1} to unlock.`;
        article.append(lockMsg);
    }
    article.append(playBtn);
    return article;
}


export { renderLobby };
