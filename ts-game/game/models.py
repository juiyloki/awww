from django.conf import settings
from django.db import models


class Level(models.Model):
    name = models.CharField(max_length=50)
    width = models.PositiveSmallIntegerField()
    height = models.PositiveSmallIntegerField()
    mine_count = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ['pk']

    def __str__(self):
        return self.name


class Score(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='scores',
    )
    level = models.ForeignKey(
        Level,
        on_delete=models.CASCADE,
        related_name='scores',
    )
    time_ms = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['time_ms', 'created_at']
        indexes = [
            models.Index(fields=['level', 'time_ms', 'created_at']),
        ]

    def __str__(self):
        return f'{self.user.username}: {self.time_ms} ms on {self.level.name}'
