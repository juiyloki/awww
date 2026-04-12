from django.urls import path
from rest_framework.routers import DefaultRouter

from .api import LevelViewSet, ScoreViewSet
from .sse import leaderboard_stream


router = DefaultRouter()
router.register('levels', LevelViewSet, basename='level')
router.register('scores', ScoreViewSet, basename='score')

urlpatterns = router.urls + [
    path('levels/<int:pk>/stream/', leaderboard_stream, name='leaderboard-stream'),
]
