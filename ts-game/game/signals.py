from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Score
from .sse import broker, serialize_top5


@receiver(post_save, sender=Score)
def broadcast_top5_on_new_score(sender, instance, created, **kwargs):
    if not created:
        return
    level_id = instance.level_id
    transaction.on_commit(lambda: broker.publish(level_id, serialize_top5(level_id)))
