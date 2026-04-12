"""
URL configuration for the accounts app, mounted at /accounts/ in mysite/urls.py.

Includes all allauth URLs (login, logout, GitHub OAuth callback, etc.) and adds
custom register and profile routes on top.
"""

from django.urls import include, path
from . import views

urlpatterns = [
    path('', include('allauth.urls')),
    path('register/', views.register, name='register'),
    path('profile/',  views.profile,  name='profile'),
]
