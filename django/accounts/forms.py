"""Forms for the accounts app: user registration."""

from django import forms
from django.contrib.auth.models import User


class RegisterForm(forms.Form):
    """Registration form for new user accounts.

    This is a plain ``Form`` (not ``ModelForm``) so that the password fields
    and confirmation can be validated together before the user is created.

    Validation:
        username  -- must be unique across all existing users.
        password2 -- must match password1.
    """

    username  = forms.CharField(max_length=150)
    email     = forms.EmailField()
    password1 = forms.CharField(widget=forms.PasswordInput, label='Password')
    password2 = forms.CharField(widget=forms.PasswordInput, label='Confirm Password')

    def clean_username(self):
        """Reject usernames that are already registered."""
        username = self.cleaned_data['username']
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError('That username is already taken.')
        return username

    def clean(self):
        """Reject mismatched passwords at the form level (cross-field validation)."""
        cleaned = super().clean()
        p1 = cleaned.get('password1')
        p2 = cleaned.get('password2')
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError('Passwords do not match.')
        return cleaned

    def save(self):
        """Create and return a new User from the validated form data.

        Must only be called after ``is_valid()`` returns True.
        """
        data = self.cleaned_data
        return User.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password1'],
        )
