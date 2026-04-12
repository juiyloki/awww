# Minesweeper

A multi-level browser Minesweeper with a live Top-5 leaderboard pushed to all
players over Server-Sent Events.

## Stack

- Backend: Django 5.2 with Django REST Framework (REST API, sessions)
- Frontend: TypeScript, compiled with `esbuild` and type-checked with `tsc`
- Database: SQLite at `db.sqlite3` (auto-created by `migrate`)
- Python deps: `uv`

## First-time setup

```bash
uv sync                                     # install Python deps
npm install                                 # install Node deps
uv run python manage.py migrate             # create db.sqlite3 + tables
uv run python manage.py seed_levels         # populate the 6 levels
uv run python manage.py createsuperuser     # optional: admin account
npm run build                               # build the TypeScript bundle
```

## Running

Two terminals:

```bash
# Terminal 1: watch TypeScript and rebuild on save
npm run watch

# Terminal 2: Django development server
uv run python manage.py runserver
```

Then open <http://127.0.0.1:8000/>, register an account, click a level.

The database is a single SQLite file at the project root (`db.sqlite3`); users,
scores, and the seeded levels persist across server restarts. To wipe and
restart fresh: `rm db.sqlite3 && uv run python manage.py migrate && uv run python manage.py seed_levels`.

## Features

What's playable / accessible once the server is running:

| Where | What |
|---|---|
| `/` (logged out) | Welcome page with Log in / Register links |
| `/accounts/register/` | Register a new user (username + email + password with confirmation) |
| `/accounts/login/` | Log in |
| `/accounts/profile/` | Username, email, join date |
| `/` (logged in) | Lobby with 6 level cards showing dims, mine count, personal best, and a "Last played" badge |
| Level card | Locked cards show "Clear Level N to unlock" until previous level is cleared |
| Click Play | Game screen: Minesweeper board, mines/timer HUD, live Top-5 panel, back button |
| In game | Left-click to reveal (first click is always safe, flood fill on 0-cells), right-click to flag |
| Win | "You won in X.Ys!" + your rank + Play again / Back to lobby; score auto-saved |
| Lose | Correctly-flagged mines stay green-tinted; wrong flags become red ✗; all unflagged mines reveal |
| Top-5 panel | Live updates via Server-Sent Events when anyone submits a new best on this level |
| `/api/swagger/` | Interactive Swagger UI to try every endpoint |
| `/api/schema/` | OpenAPI 3.0 schema (machine-readable YAML) |
| `/admin/` | Django admin for inspecting Levels, Scores, Users (requires `createsuperuser`) |
| narrow viewport | Responsive layout: lobby collapses to single column, cells shrink |

## Tests and type-check

```bash
uv run python manage.py test                # 22 Django tests
npm run check                               # TypeScript type-check
uv run python manage.py spectacular --validate --fail-on-warn  
```
