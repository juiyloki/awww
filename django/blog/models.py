"""Database models for the blog app: Category, Post, and Comment."""

from django.db import models


class Category(models.Model):
    """A top-level grouping for blog posts (e.g. "Python", "Django")."""

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Post(models.Model):
    """A single blog post, optionally assigned to a category.

    Deleting a category sets its posts' category to NULL rather than
    cascading the delete (SET_NULL), so posts are preserved.
    ``view_count`` is incremented atomically via F() expressions in views
    to avoid race conditions under concurrent requests.
    """

    title      = models.CharField(max_length=200)
    slug       = models.SlugField(unique=True)
    body       = models.TextField()
    pub_date   = models.DateTimeField(auto_now_add=True)
    category   = models.ForeignKey(
        Category, on_delete=models.SET_NULL,  # keep posts when category is deleted
        null=True, blank=True, related_name='posts',
    )
    view_count = models.PositiveIntegerField(default=0)  # incremented on each detail page load

    class Meta:
        ordering = ['-pub_date']  # newest first

    @property
    def comments_active(self):
        """Return only approved comments (active=True) for serializers."""
        return self.comments.filter(active=True)

    def __str__(self):
        return self.title


class Comment(models.Model):
    """A reader comment attached to a blog post.

    ``active`` acts as a soft moderation flag: False hides the comment
    from public views without deleting it from the database.
    """

    post    = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author  = models.CharField(max_length=100)
    email   = models.EmailField()
    body    = models.TextField()
    created = models.DateTimeField(auto_now_add=True)
    active  = models.BooleanField(default=True)  # set to False to hide without deleting

    class Meta:
        ordering = ['created']  # oldest comment first (chronological thread)

    def __str__(self):
        return f'Comment by {self.author} on {self.post}'
