# TypeScript Labs

Solutions for AWWW labs 8, 9, and 10 at the MIMUW.

Lab 8 is a standalone TypeScript page that demonstrates basic types, generics, and async patterns, bundled with esbuild and opened as a static HTML file. Labs 9 and 10 build on top of the Django blog from previous labs: the server exposes a JSON API, and the client is a TypeScript single page that filters, searches, expands, comments on, and live polls posts using a typed HTTP client.

Author: Agata Kopeć.

## Lab 8

```bash
cd lab-8
npm install
npm run build
```

Then open `index.html` in a browser.

## Lab 9 and 10

```bash
cd lab-9-10
cp .env.example .env   # fill in GitHub OAuth credentials
npm install
npm run build
uv run python manage.py migrate
uv run python manage.py loaddata blog/fixtures/initial_categories.json
uv run python manage.py runserver
```

Open http://127.0.0.1:8000/browse/ for the lab 9 and 10 page.
