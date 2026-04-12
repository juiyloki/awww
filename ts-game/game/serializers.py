from rest_framework import serializers

from .models import Level, Score


LEADERBOARD_SIZE = 5


class LevelSerializer(serializers.ModelSerializer):
    personal_best_ms = serializers.SerializerMethodField()
    unlocked = serializers.SerializerMethodField()

    class Meta:
        model = Level
        fields = ['id', 'name', 'width', 'height', 'mine_count', 'personal_best_ms', 'unlocked']

    def get_personal_best_ms(self, level) -> int | None:
        return self.context.get('personal_bests', {}).get(level.pk)

    def get_unlocked(self, level) -> bool:
        if level.pk == 1:
            return True
        cleared = self.context.get('cleared_level_pks', set())
        return (level.pk - 1) in cleared


class LeaderboardEntrySerializer(serializers.Serializer):
    username = serializers.CharField(source='user.username')
    time_ms = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class ScoreSerializer(serializers.ModelSerializer):
    rank = serializers.SerializerMethodField()

    class Meta:
        model = Score
        fields = ['id', 'level', 'time_ms', 'created_at', 'rank']
        read_only_fields = ['id', 'created_at', 'rank']

    def validate(self, attrs):
        user = self.context['request'].user
        level = attrs['level']
        if level.pk == 1:
            return attrs
        previous_cleared = Score.objects.filter(
            user=user, level_id=level.pk - 1
        ).exists()
        if not previous_cleared:
            raise serializers.ValidationError({
                'level': f'You must clear Level {level.pk - 1} first.',
            })
        return attrs

    def get_rank(self, score) -> int | None:
        top_ids = list(
            Score.objects.filter(level=score.level)
            .order_by('time_ms', 'created_at')
            .values_list('id', flat=True)[:LEADERBOARD_SIZE]
        )
        if score.id in top_ids:
            return top_ids.index(score.id) + 1
        return None
