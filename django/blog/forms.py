"""Forms for the blog app: comment submission and staff post creation."""

from django import forms
from .models import Comment, Post


class CommentForm(forms.ModelForm):
    """Form for submitting a reader comment on a blog post.

    Validation rules:
        author -- must be at least 2 characters after stripping whitespace.
        body   -- must not exceed 1000 characters.
    """

    class Meta:
        model  = Comment
        fields = ['author', 'email', 'body']
        widgets = {
            'body': forms.Textarea(attrs={'rows': 4}),
        }
        labels = {
            'author': 'Your Name',
        }

    def clean_author(self):
        """Reject author names shorter than 2 characters."""
        author = self.cleaned_data['author'].strip()
        if len(author) < 2:
            raise forms.ValidationError('Name must be at least 2 characters.')
        return author

    def clean_body(self):
        """Reject comment bodies longer than 1000 characters."""
        body = self.cleaned_data['body']
        if len(body) > 1000:
            raise forms.ValidationError('Comment must be 1000 characters or fewer.')
        return body


class PostForm(forms.ModelForm):
    """Form for creating or editing a blog post (staff-only view)."""

    class Meta:
        model  = Post
        fields = ['title', 'slug', 'body', 'category']
        widgets = {
            'body': forms.Textarea(attrs={'rows': 8}),
        }
