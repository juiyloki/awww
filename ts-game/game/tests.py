import json
import queue

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase

from .models import Score
from .sse import broker


class GameApiTests(TestCase):

    @classmethod
    def setUpTestData(cls):
        call_command('seed_levels')

    def test_levels_list_returns_six(self):
        response = self.client.get('/api/levels/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 6)

    def test_score_creation_requires_authentication(self):
        response = self.client.post(
            '/api/scores/',
            json.dumps({'level': 1, 'time_ms': 12345}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)

    def test_score_creation_returns_201_with_rank(self):
        user = User.objects.create_user('runner', password='longenoughpw')
        self.client.force_login(user)
        response = self.client.post(
            '/api/scores/',
            json.dumps({'level': 1, 'time_ms': 12345}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body['time_ms'], 12345)
        self.assertEqual(body['rank'], 1)

    def test_leaderboard_orders_by_time_ascending(self):
        u1 = User.objects.create_user('u1', password='longenoughpw')
        u2 = User.objects.create_user('u2', password='longenoughpw')
        Score.objects.create(user=u1, level_id=1, time_ms=50000)
        Score.objects.create(user=u2, level_id=1, time_ms=20000)
        Score.objects.create(user=u1, level_id=1, time_ms=30000)
        response = self.client.get('/api/levels/1/leaderboard/')
        entries = response.json()
        self.assertEqual(
            [(e['username'], e['time_ms']) for e in entries],
            [('u2', 20000), ('u1', 30000)],
        )

    def test_leaderboard_shows_only_user_personal_best(self):
        user = User.objects.create_user('repeat', password='longenoughpw')
        Score.objects.create(user=user, level_id=1, time_ms=10000)
        Score.objects.create(user=user, level_id=1, time_ms=20000)
        Score.objects.create(user=user, level_id=1, time_ms=15000)
        response = self.client.get('/api/levels/1/leaderboard/')
        entries = response.json()
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]['username'], 'repeat')
        self.assertEqual(entries[0]['time_ms'], 10000)

    def test_personal_best_appears_for_authenticated_user(self):
        user = User.objects.create_user('player', password='longenoughpw')
        Score.objects.create(user=user, level_id=2, time_ms=30000)
        self.client.force_login(user)
        response = self.client.get('/api/levels/')
        levels_by_id = {L['id']: L for L in response.json()}
        self.assertEqual(levels_by_id[2]['personal_best_ms'], 30000)
        self.assertIsNone(levels_by_id[1]['personal_best_ms'])

    def test_level_one_is_always_unlocked(self):
        response = self.client.get('/api/levels/')
        levels_by_id = {L['id']: L for L in response.json()}
        self.assertTrue(levels_by_id[1]['unlocked'])

    def test_locked_levels_for_new_user(self):
        user = User.objects.create_user('newbie', password='longenoughpw')
        self.client.force_login(user)
        response = self.client.get('/api/levels/')
        levels_by_id = {L['id']: L for L in response.json()}
        self.assertTrue(levels_by_id[1]['unlocked'])
        for pk in (2, 3, 4, 5, 6):
            self.assertFalse(levels_by_id[pk]['unlocked'])

    def test_clearing_level_unlocks_the_next(self):
        user = User.objects.create_user('climber', password='longenoughpw')
        Score.objects.create(user=user, level_id=1, time_ms=5000)
        self.client.force_login(user)
        response = self.client.get('/api/levels/')
        levels_by_id = {L['id']: L for L in response.json()}
        self.assertTrue(levels_by_id[2]['unlocked'])
        self.assertFalse(levels_by_id[3]['unlocked'])

    def test_score_submission_blocked_for_locked_level(self):
        user = User.objects.create_user('cheater', password='longenoughpw')
        self.client.force_login(user)
        response = self.client.post(
            '/api/scores/',
            json.dumps({'level': 3, 'time_ms': 12345}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('level', response.json())


class LeaderboardBrokerTests(TestCase):

    def test_publish_delivers_to_subscriber_on_same_level(self):
        q = broker.subscribe(99)
        try:
            broker.publish(99, [{'username': 'alice', 'time_ms': 1000}])
            msg = q.get_nowait()
            self.assertEqual(msg, [{'username': 'alice', 'time_ms': 1000}])
        finally:
            broker.unsubscribe(99, q)

    def test_publish_does_not_deliver_to_other_levels(self):
        q = broker.subscribe(97)
        try:
            broker.publish(98, [{'username': 'bob', 'time_ms': 2000}])
            with self.assertRaises(queue.Empty):
                q.get_nowait()
        finally:
            broker.unsubscribe(97, q)

    def test_unsubscribe_removes_queue_from_subscribers(self):
        q = broker.subscribe(96)
        broker.unsubscribe(96, q)
        broker.publish(96, [{'username': 'carol', 'time_ms': 3000}])
        with self.assertRaises(queue.Empty):
            q.get_nowait()
