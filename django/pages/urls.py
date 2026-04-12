"""URL configuration for the pages app (home, about, greet, projects, guestbook, api-demo)."""

from django.urls import path
from . import views

urlpatterns = [
    path('',                   views.home,       name='home'),
    path('about/',             views.about,      name='about'),
    path('greet/<str:name>/',  views.greet,      name='greet'),
    path('projects/',          views.projects,   name='projects'),
    path('guestbook/',         views.guestbook,  name='guestbook'),
    path('api-demo/',          views.api_demo,   name='api-demo'),
]
