from django.db.models import Min
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Level, Score
from .serializers import LevelSerializer, ScoreSerializer
from .sse import serialize_top5


class LevelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Level.objects.all()
    serializer_class = LevelSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user.is_authenticated:
            personal_bests = dict(
                Score.objects.filter(user=user)
                .values('level')
                .annotate(best=Min('time_ms'))
                .values_list('level', 'best')
            )
            context['personal_bests'] = personal_bests
            context['cleared_level_pks'] = set(personal_bests.keys())
        return context

    @action(detail=True, methods=['get'])
    def leaderboard(self, request, pk=None):
        return Response(serialize_top5(int(pk)))


class ScoreViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = Score.objects.all()
    serializer_class = ScoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
