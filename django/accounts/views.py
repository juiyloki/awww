"""Views for the accounts app: user registration and profile."""

from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import RegisterForm


def register(request):
    """Render and process the registration form.

    On successful POST, creates the user, logs them in immediately, and
    redirects to the home page.  The ``backend`` argument is required when
    calling ``login()`` outside of ``authenticate()`` because multiple auth
    backends are configured (ModelBackend + allauth).
    """
    form = RegisterForm()
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Specify backend explicitly — required when multiple backends are configured
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            return redirect('home')
    return render(request, 'accounts/register.html', {'form': form, 'page_title': 'Register'})


@login_required
def profile(request):
    """Render the authenticated user's profile page.

    Requires login; unauthenticated users are redirected to LOGIN_URL.
    """
    return render(request, 'accounts/profile.html', {
        'user': request.user, 'page_title': 'Profile',
    })
