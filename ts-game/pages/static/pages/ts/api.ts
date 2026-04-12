type Result<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; status?: number };

interface Level {
    id: number;
    name: string;
    width: number;
    height: number;
    mine_count: number;
    personal_best_ms: number | null;
    unlocked: boolean;
}

interface LeaderboardEntry {
    username: string;
    time_ms: number;
    created_at: string;
}

interface CreateScorePayload {
    level: number;
    time_ms: number;
}

interface CreatedScore {
    id: number;
    level: number;
    time_ms: number;
    created_at: string;
    rank: number | null;
}

function getCsrfToken(): string {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match !== null ? match[1] : '';
}

async function apiFetch<T>(
    method: string,
    path: string,
    body?: unknown,
): Promise<Result<T>> {
    try {
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
        };
        if (body !== undefined) {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(path, options);

        if (!res.ok) {
            let message = `HTTP ${res.status}`;
            try {
                const errBody = await res.json();
                if (typeof errBody.detail === 'string') {
                    message = errBody.detail;
                }
            } catch {
                // response wasn't JSON; keep the generic HTTP message
            }
            return { ok: false, error: message, status: res.status };
        }

        if (res.status === 204) {
            return { ok: true, data: {} as T };
        }

        const data: T = await res.json();
        return { ok: true, data };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

class GameApi {
    async getLevels(): Promise<Result<Level[]>> {
        return apiFetch('GET', '/api/levels/');
    }

    async getLeaderboard(levelId: number): Promise<Result<LeaderboardEntry[]>> {
        return apiFetch('GET', `/api/levels/${levelId}/leaderboard/`);
    }

    async createScore(payload: CreateScorePayload): Promise<Result<CreatedScore>> {
        return apiFetch('POST', '/api/scores/', payload);
    }
}

const api = new GameApi();

export {
    api,
    GameApi,
    Level,
    LeaderboardEntry,
    CreateScorePayload,
    CreatedScore,
    Result,
};
