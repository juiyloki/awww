"""URL configuration for the hand-rolled JSON API, mounted at /api/ in mysite/urls.py."""

from django.urls import path
from . import api

urlpatterns = [
    path('posts/',                      api.PostListView.as_view(),    name='api-post-list'),
    path('posts/<int:pk>/',             api.PostDetailView.as_view(),  name='api-post-detail'),
    path('posts/<int:pk>/comments/',                       api.PostCommentView.as_view(),   name='api-post-comments'),
    path('posts/<int:pk>/comments/<int:comment_id>/',      api.CommentDetailView.as_view(), name='api-post-comment-detail'),
]
