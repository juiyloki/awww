"""Admin site registrations for the blog app models."""

from django.contrib import admin
from .models import Category, Post, Comment


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Admin for Category: auto-populates slug from the name field."""

    list_display       = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    """Admin for Post: searchable by title/body, filterable by category, slug auto-populated."""

    list_display        = ['title', 'pub_date', 'category', 'view_count']
    list_filter         = ['category']
    search_fields       = ['title', 'body']
    prepopulated_fields = {'slug': ('title',)}


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """Admin for Comment: filterable by active status for quick moderation."""

    list_display = ['author', 'post', 'created', 'active']
    list_filter  = ['active']
