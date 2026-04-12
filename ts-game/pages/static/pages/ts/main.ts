import { Level } from './api';
import { startGame } from './game';
import { renderLobby } from './lobby';


const appRoot = document.getElementById('app-root');
if (appRoot !== null) {
    showLobby(appRoot);
}

function showLobby(container: HTMLElement): void {
    renderLobby(container, (level: Level) => {
        startGame(container, level, () => showLobby(container));
    });
}
