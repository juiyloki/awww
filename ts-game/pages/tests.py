from django.contrib.auth.models import User
from django.test import TestCase


class PagesTests(TestCase):

    def test_home_status(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_home_uses_base_template(self):
        response = self.client.get('/')
        self.assertTemplateUsed(response, 'pages/base.html')
        self.assertTemplateUsed(response, 'pages/home.html')

    def test_home_shows_welcome_message_when_anonymous(self):
        response = self.client.get('/')
        self.assertContains(response, 'Welcome')
        self.assertNotContains(response, 'id="app-root"')

    def test_home_shows_app_root_when_authenticated(self):
        user = User.objects.create_user('player', password='longenoughpw')
        self.client.force_login(user)
        response = self.client.get('/')
        self.assertContains(response, 'id="app-root"')
        self.assertContains(response, 'Choose a level')
