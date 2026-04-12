"""DRF serializers for the blog app, used by the /drf/ endpoints."""

from rest_framework import serializers
from .models import Comment, Post


class CommentSerializer(serializers.ModelSerializer):
    """Serialize a Comment to/from JSON (id, author, body, created)."""

    class Meta:
        model  = Comment
        fields = ['id', 'author', 'body', 'created']


class PostSerializer(serializers.ModelSerializer):
    """Serialize a Post to/from JSON, including its nested active comments (read-only).

    The nested ``comments`` field embeds full comment data in GET responses;
    it is read-only so comments cannot be created via the post endpoint.
    """

    comments = CommentSerializer(
        source='comments_active', many=True, read_only=True
    )

    class Meta:
        model  = Post
        fields = ['id', 'title', 'slug', 'body', 'pub_date', 'category', 'comments']
