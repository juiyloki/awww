"""URL configuration for the blog app (template-based views, namespace 'blog')."""

from django.urls import path
from . import views

app_name = 'blog'

urlpatterns = [
    path('',                          views.post_list,     name='post-list'),
    path('post/<slug:slug>/',         views.post_detail,   name='post-detail'),
    path('category/<slug:slug>/',     views.category_posts, name='category-posts'),
    path('new/',                      views.post_create,   name='post-create'),
]
