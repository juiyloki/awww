"""
Views for the pages app.

Covers the general-purpose pages: home, about, greet, projects list with search,
in-memory guestbook, and the JavaScript API demo page.
"""

import datetime
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

# ── Projects dataset ────────────────────────────────────────────────────────────
ALL_PROJECTS = [
    {
        "name": "Raw HTTP Server",
        "lang": "Python, HTML, CSS",
        "year": 2025,
        "done": True,
        "url":  "https://github.com/juiyloki/awww",
    },
    {
        "name": "Terraria Wiki Scraper",
        "lang": "Python",
        "year": 2025,
        "done": True,
        "url":  "https://github.com/juiyloki/WikiScraper",
    },
    {
        "name": "Lottery",
        "lang": "Java",
        "year": 2025,
        "done": True,
        "url":  "https://github.com/juiyloki/Lottery",
    },
    {
        "name": "Static Personal Website (Lab 1–3)",
        "lang": "HTML, CSS",
        "year": 2025,
        "done": True,
        "url":  "https://github.com/juiyloki/awww",
    },
    {
        "name": "Django Web App (Lab 4–7)",
        "lang": "Python, Django",
        "year": 2025,
        "done": False,
        "url":  "",
    },
]

# In-memory guestbook — resets on server restart (no database needed for this challenge)
ENTRIES = []


def home(request):
    """Render the home page with the current server time and a per-session visit counter."""
    # Session counter persists across requests for the same browser session
    count = request.session.get('visit_count', 0) + 1
    request.session['visit_count'] = count
    context = {
        'page_title':  'Home',
        'heading':     'Welcome!',
        'server_time': datetime.datetime.now(),
        'visit_count': count,
    }
    return render(request, 'pages/home.html', context)


def about(request):
    """Render the about page with education info, skills list, and a fun fact."""
    # Personalise: replace all three with your own content
    skills    = ['Python', 'HTTP', 'HTML', 'CSS']
    education = 'Second-year Computer Science student at University of Warsaw.'
    fun_fact  = 'I have two cats.'
    return render(request, 'pages/about.html', {
        'skills': skills, 'education': education, 'fun_fact': fun_fact,
        'page_title': 'About',
    })


def greet(request, name):
    """Render a personalised greeting page; accept an optional POST note from the visitor.

    Args:
        name: The name captured from the URL, e.g. /greet/Alice/.
    """
    message = ''
    if request.method == 'POST':
        note = request.POST.get('note', '').strip()
        if note:
            message = f'Thanks, {name}! Your note: "{note}"'
    return render(request, 'pages/greet.html', {
        'name': name, 'message': message, 'page_title': f'Hello {name}',
    })


def projects(request):
    """Render the projects list, optionally filtered by a search query.

    Supports GET parameter ``q`` to filter by project name or language
    (case-insensitive substring match).
    """
    q = request.GET.get('q', '').strip()
    if q:
        project_list = [
            p for p in ALL_PROJECTS
            if q.lower() in p['name'].lower() or q.lower() in p['lang'].lower()
        ]
    else:
        project_list = ALL_PROJECTS
    done_count = sum(1 for p in project_list if p['done'])
    return render(request, 'pages/projects.html', {
        'project_list': project_list,
        'done_count':   done_count,
        'q':            q,
        'page_title':   'Projects',
    })


def guestbook(request):
    """Display guestbook entries and handle POST submissions (Post/Redirect/Get pattern)."""
    if request.method == 'POST':
        name    = request.POST.get('name', '').strip()
        message = request.POST.get('message', '').strip()
        if name and message:
            ENTRIES.append({'name': name, 'message': message})
        # PRG: redirect to avoid duplicate submission on browser refresh
        return HttpResponseRedirect(reverse('guestbook'))
    return render(request, 'pages/guestbook.html', {
        'entries': ENTRIES, 'page_title': 'Guestbook',
    })


def api_demo(request):
    """Render the API demo page, which loads posts dynamically via JavaScript fetch()."""
    return render(request, 'pages/api_demo.html', {'page_title': 'API Demo'})
