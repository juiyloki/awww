"""DRF ViewSet for the blog Post model, mounted at /drf/ via DefaultRouter."""

from rest_framework import permissions, viewsets
from .models import Post
from .serializers import PostSerializer


class PostViewSet(viewsets.ModelViewSet):
    """Full CRUD API for posts via Django REST Framework.

    Unauthenticated users have read-only access (GET list + detail).
    Authenticated users can create, update, and delete posts.
    Routed automatically by DefaultRouter in drf_urls.py.
    """

    queryset           = Post.objects.select_related('category')
    serializer_class   = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
