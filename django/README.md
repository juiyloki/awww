# Django Blog

A full-featured Django web application built across Labs 4–7 of the AWWW course at the University of Warsaw.

**Features:** blog with categories and comments, user registration and login, GitHub OAuth, hand-rolled JSON API, Django REST Framework + Swagger UI.

**Author:** Agata Kopeć

## Setup

Copy `.env.example` to `.env` and fill in your GitHub OAuth credentials.

## Running

```bash
uv run python manage.py migrate
uv run python manage.py loaddata blog/fixtures/initial_categories.json
uv run python manage.py runserver
```

Open at http://127.0.0.1:8000
