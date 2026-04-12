"""Views for the blog app: post list, post detail with comments, category filter, and post creation."""

from django.contrib.auth.decorators import login_required, user_passes_test
from django.db.models import Count, F
from django.shortcuts import get_object_or_404, redirect, render

from .forms import CommentForm, PostForm
from .models import Category, Post


def post_list(request):
    """Render the blog index with all posts and a category sidebar.

    Uses select_related to avoid per-post category queries (N+1 prevention),
    and annotates each post with its comment count in a single SQL query.
    """
    posts      = Post.objects.select_related('category').annotate(comment_count=Count('comments'))
    categories = Category.objects.all()
    return render(request, 'blog/post_list.html', {
        'posts': posts, 'categories': categories,
    })


def post_detail(request, slug):
    """Render a single post with its active comments and comment submission form.

    Implements the Post/Redirect/Get (PRG) pattern: a valid comment POST redirects
    back to this page, preventing duplicate submissions on browser refresh.

    Args:
        slug: The unique slug of the post.
    """
    post     = get_object_or_404(Post, slug=slug)
    comments = post.comments.filter(active=True)
    form     = CommentForm()

    # Increment view counter atomically via F() to avoid lost updates under concurrency
    Post.objects.filter(pk=post.pk).update(view_count=F('view_count') + 1)

    if request.method == 'POST':
        form = CommentForm(request.POST)
        if form.is_valid():
            comment      = form.save(commit=False)
            comment.post = post
            comment.save()
            # PRG redirect — browser reload won't resubmit the comment
            return redirect('blog:post-detail', slug=post.slug)

    return render(request, 'blog/post_detail.html', {
        'post': post, 'comments': comments, 'form': form,
    })


def category_posts(request, slug):
    """Render the post list filtered to a single category.

    Args:
        slug: The unique slug of the category to filter by.
    """
    category = get_object_or_404(Category, slug=slug)
    posts    = Post.objects.filter(category=category).select_related('category').annotate(
        comment_count=Count('comments')
    )
    return render(request, 'blog/post_list.html', {
        'posts': posts,
        'categories': Category.objects.all(),
        'active_category': category,
    })


@login_required
@user_passes_test(lambda u: u.is_staff)
def post_create(request):
    """Render and process the new-post form (staff only).

    Requires the user to be both authenticated and a staff member.
    On successful submission, redirects to the newly created post.
    """
    form = PostForm()
    if request.method == 'POST':
        form = PostForm(request.POST)
        if form.is_valid():
            post = form.save()
            return redirect('blog:post-detail', slug=post.slug)
    return render(request, 'blog/post_form.html', {'form': form, 'page_title': 'New Post'})
