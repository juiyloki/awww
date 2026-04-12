"""
Hand-rolled JSON API views for the blog app (no DRF).

Mounted at /api/ via blog.api_urls. All views are @csrf_exempt so that
external clients (e.g. the JS fetch() demo, curl) can make POST/PATCH/DELETE
requests without a CSRF token, which is acceptable for a stateless JSON
API that relies on session or token auth rather than browser cookies.

Endpoints:
    GET  /api/posts/                     -- list posts (supports ?search=)
    POST /api/posts/                     -- create post (auth required)
    GET  /api/posts/<pk>/                -- retrieve one post
    PATCH /api/posts/<pk>/               -- partial update (auth required)
    DELETE /api/posts/<pk>/              -- delete (auth required)
    GET  /api/posts/<pk>/comments/       -- list active comments
    POST /api/posts/<pk>/comments/       -- add a comment
    DELETE /api/posts/<pk>/comments/<comment_id>/ -- remove a comment
"""

import json

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .models import Comment, Post


def post_to_dict(post):
    """Serialize a Post instance to a JSON-safe dictionary.

    Args:
        post: A Post model instance.

    Returns:
        A dict with id, title, slug, body, pub_date (ISO 8601), and category name.
    """
    return {
        'id':       post.id,
        'title':    post.title,
        'slug':     post.slug,
        'body':     post.body,
        'pub_date': post.pub_date.isoformat(),
        'category': post.category.name if post.category else None,
    }


@method_decorator(csrf_exempt, name='dispatch')
class PostListView(View):
    """API view for the post collection: list all posts or create a new one."""

    def get(self, request):
        """Return a JSON list of all posts, optionally filtered by ``?search=`` (title substring)."""
        query = request.GET.get('search', '')
        posts = Post.objects.select_related('category')
        if query:
            posts = posts.filter(title__icontains=query)
        return JsonResponse({'posts': [post_to_dict(p) for p in posts]})

    def post(self, request):
        """Create a new post from a JSON body. Requires authentication.

        Request body (JSON): ``title``, ``slug``, ``body`` (all required).

        Returns:
            201 with the created post, 400 on bad input, 401 if not authenticated.
        """
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required.'}, status=401)
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON.'}, status=400)
        for field in ('title', 'slug', 'body'):
            if not data.get(field):
                return JsonResponse({'error': f'Field "{field}" is required.'}, status=400)
        post = Post.objects.create(
            title=data['title'],
            slug=data['slug'],
            body=data['body'],
        )
        return JsonResponse(post_to_dict(post), status=201)


@method_decorator(csrf_exempt, name='dispatch')
class PostDetailView(View):
    """API view for a single post: retrieve, partial update, or delete."""

    def _get(self, pk):
        """Fetch a post by primary key, or return None if not found."""
        return Post.objects.filter(pk=pk).select_related('category').first()

    def get(self, request, pk):
        """Return the post with the given pk, or 404."""
        post = self._get(pk)
        if post is None:
            return JsonResponse({'error': 'Not found.'}, status=404)
        return JsonResponse(post_to_dict(post))

    def patch(self, request, pk):
        """Partially update a post. Requires authentication.

        Accepts any subset of ``title``, ``slug``, ``body`` in the JSON body.

        Returns:
            200 with the updated post, 400 on bad JSON, 401/404 as appropriate.
        """
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required.'}, status=401)
        post = self._get(pk)
        if post is None:
            return JsonResponse({'error': 'Not found.'}, status=404)
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON.'}, status=400)
        for field in ('title', 'body', 'slug'):
            if field in data:
                setattr(post, field, data[field])
        post.save()
        return JsonResponse(post_to_dict(post))

    def delete(self, request, pk):
        """Delete a post. Requires authentication. Returns 204 No Content."""
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required.'}, status=401)
        post = self._get(pk)
        if post is None:
            return JsonResponse({'error': 'Not found.'}, status=404)
        post.delete()
        return JsonResponse({}, status=204)


@method_decorator(csrf_exempt, name='dispatch')
class PostCommentView(View):
    """API view for the comments collection of a post: list or add comments."""

    def get(self, request, pk):
        """Return all active comments for the given post, or 404 if the post doesn't exist."""
        post = Post.objects.filter(pk=pk).first()
        if post is None:
            return JsonResponse({'error': 'Not found.'}, status=404)
        comments = post.comments.filter(active=True)
        data = [
            {'id': c.id, 'author': c.author, 'body': c.body, 'created': c.created.isoformat()}
            for c in comments
        ]
        return JsonResponse({'comments': data})

    def post(self, request, pk):
        """Add a comment to the given post. No authentication required.

        Request body (JSON): ``author`` and ``body`` (required), ``email`` (optional).

        Returns:
            201 with the created comment, 400 on bad input, 404 if post not found.
        """
        post = Post.objects.filter(pk=pk).first()
        if post is None:
            return JsonResponse({'error': 'Not found.'}, status=404)
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON.'}, status=400)
        author = data.get('author', '').strip()
        body   = data.get('body', '').strip()
        email  = data.get('email', '').strip()
        if not author or not body:
            return JsonResponse({'error': 'Fields "author" and "body" are required.'}, status=400)
        comment = Comment.objects.create(post=post, author=author, body=body, email=email, active=True)
        return JsonResponse({
            'id': comment.id, 'author': comment.author,
            'body': comment.body, 'created': comment.created.isoformat(),
        }, status=201)


@method_decorator(csrf_exempt, name='dispatch')
class CommentDetailView(View):
    """API view for a single comment on a post: delete only."""

    def delete(self, request, pk, comment_id):
        """Delete the given comment if it belongs to the given post. Returns 204 No Content."""
        comment = Comment.objects.filter(pk=comment_id, post_id=pk).first()
        if comment is None:
            return JsonResponse({'error': 'Not found.'}, status=404)
        comment.delete()
        return JsonResponse({}, status=204)
