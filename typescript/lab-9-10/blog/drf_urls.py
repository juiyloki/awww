"""
URL configuration for the DRF API, mounted at /drf/ in mysite/urls.py.

DefaultRouter auto-generates the following routes from PostViewSet:
    GET  /drf/posts/        -- list all posts
    POST /drf/posts/        -- create a post (auth required)
    GET  /drf/posts/<pk>/   -- retrieve one post
    PUT  /drf/posts/<pk>/   -- full update (auth required)
    PATCH /drf/posts/<pk>/  -- partial update (auth required)
    DELETE /drf/posts/<pk>/ -- delete (auth required)
"""

from rest_framework.routers import DefaultRouter
from .drf_views import PostViewSet

router = DefaultRouter()
router.register('posts', PostViewSet)

urlpatterns = router.urls
