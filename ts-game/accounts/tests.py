from django.contrib.auth.models import User
from django.test import TestCase


class AccountsTests(TestCase):

    def test_register_creates_and_logs_in_user(self):
        response = self.client.post('/accounts/register/', {
            'username': 'alice',
            'email': 'a@example.com',
            'password1': 'longenoughpw',
            'password2': 'longenoughpw',
        }, follow=True)
        self.assertContains(response, 'Hello, alice')
        self.assertTrue(User.objects.filter(username='alice').exists())

    def test_register_rejects_mismatched_passwords(self):
        response = self.client.post('/accounts/register/', {
            'username': 'bob',
            'email': 'b@example.com',
            'password1': 'one',
            'password2': 'two',
        })
        self.assertContains(response, 'Passwords do not match')
        self.assertFalse(User.objects.filter(username='bob').exists())

    def test_register_rejects_duplicate_username(self):
        User.objects.create_user('alice', password='longenoughpw')
        response = self.client.post('/accounts/register/', {
            'username': 'alice',
            'email': 'a2@example.com',
            'password1': 'longenoughpw',
            'password2': 'longenoughpw',
        })
        self.assertContains(response, 'already exists')

    def test_profile_redirects_anonymous_to_login(self):
        response = self.client.get('/accounts/profile/')
        self.assertEqual(response.status_code, 302)
        self.assertIn('/accounts/login/', response.url)

    def test_login_returns_user_to_home(self):
        User.objects.create_user('carol', password='longenoughpw')
        response = self.client.post('/accounts/login/', {
            'username': 'carol',
            'password': 'longenoughpw',
        }, follow=True)
        self.assertContains(response, 'Hello, carol')
