"""
Required automated tests for the pages app (Lab 4, Phase 7).

Run with:
    uv run python manage.py test pages
Expected result: 5 tests, OK.
"""

from django.test import TestCase


class PagesTests(TestCase):
    """Integration tests for the general-purpose pages app views."""

    def test_home_status(self):
        """Home page returns HTTP 200."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_about_uses_correct_template(self):
        """About page renders with the pages/about.html template."""
        response = self.client.get('/about/')
        self.assertTemplateUsed(response, 'pages/about.html')

    def test_about_has_four_skills(self):
        """About view passes exactly 4 skills in template context."""
        response = self.client.get('/about/')
        self.assertEqual(len(response.context['skills']), 4)

    def test_greet_contains_name(self):
        """Greet page displays the name captured from the URL."""
        response = self.client.get('/greet/Alice/')
        self.assertIn(b'Alice', response.content)

    def test_projects_search_filters(self):
        """Search query ?q=python returns only Python-related projects."""
        response = self.client.get('/projects/?q=python')
        for project in response.context['project_list']:
            self.assertTrue(
                'python' in project['lang'].lower() or
                'python' in project['name'].lower(),
                f"Unexpected project in results: {project}",
            )
