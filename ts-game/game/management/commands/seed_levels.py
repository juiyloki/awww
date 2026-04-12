from django.core.management.base import BaseCommand

from game.models import Level


LEVELS = [
    (1, 'Level 1',  8,  8,  10),
    (2, 'Level 2', 10, 10,  18),
    (3, 'Level 3', 12, 12,  28),
    (4, 'Level 4', 16, 16,  50),
    (5, 'Level 5', 20, 20,  90),
    (6, 'Level 6', 24, 24, 140),
]


class Command(BaseCommand):
    help = 'Create the five Minesweeper levels.'

    def handle(self, *args, **options):
        for pk, name, width, height, mines in LEVELS:
            Level.objects.update_or_create(
                pk=pk,
                defaults={
                    'name': name,
                    'width': width,
                    'height': height,
                    'mine_count': mines,
                },
            )
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(LEVELS)} levels.'))
