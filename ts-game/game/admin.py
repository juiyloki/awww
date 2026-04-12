from django.contrib import admin

from .models import Level, Score


@admin.register(Level)
class LevelAdmin(admin.ModelAdmin):
    list_display = ['name', 'width', 'height', 'mine_count']


@admin.register(Score)
class ScoreAdmin(admin.ModelAdmin):
    list_display = ['user', 'level', 'time_ms', 'created_at']
    list_filter = ['level']
    search_fields = ['user__username']
