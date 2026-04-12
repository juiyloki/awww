"""SSE plumbing for the live Top-5 leaderboard."""

import json
import queue
import threading
from collections import defaultdict

from django.http import Http404, StreamingHttpResponse

from .models import Level, Score
from .serializers import LEADERBOARD_SIZE, LeaderboardEntrySerializer


HEARTBEAT_TIMEOUT_SECONDS = 15
SUBSCRIBER_QUEUE_SIZE = 100


class LeaderboardBroker:
    """In-process pub/sub keyed by level id."""

    def __init__(self):
        self._subscribers: dict[int, list[queue.Queue]] = defaultdict(list)
        self._lock = threading.Lock()

    def subscribe(self, level_id: int) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=SUBSCRIBER_QUEUE_SIZE)
        with self._lock:
            self._subscribers[level_id].append(q)
        return q

    def unsubscribe(self, level_id: int, q: queue.Queue) -> None:
        with self._lock:
            if q in self._subscribers[level_id]:
                self._subscribers[level_id].remove(q)

    def publish(self, level_id: int, data: list) -> None:
        with self._lock:
            queues = list(self._subscribers[level_id])
        for q in queues:
            try:
                q.put_nowait(data)
            except queue.Full:
                # slow consumer; drop the event rather than block the producer
                pass


broker = LeaderboardBroker()


def serialize_top5(level_id: int) -> list:
    scores = (
        Score.objects.filter(level_id=level_id)
        .select_related('user')
        .order_by('time_ms', 'created_at')
    )
    seen_users: set[int] = set()
    top: list = []
    for score in scores:
        if score.user_id in seen_users:
            continue
        seen_users.add(score.user_id)
        top.append(score)
        if len(top) >= LEADERBOARD_SIZE:
            break
    return list(LeaderboardEntrySerializer(top, many=True).data)


def leaderboard_stream(request, pk: int):
    if not Level.objects.filter(pk=pk).exists():
        raise Http404

    def event_stream():
        q = broker.subscribe(pk)
        try:
            yield f'data: {json.dumps(serialize_top5(pk))}\n\n'
            while True:
                try:
                    data = q.get(timeout=HEARTBEAT_TIMEOUT_SECONDS)
                    yield f'data: {json.dumps(data)}\n\n'
                except queue.Empty:
                    yield ': heartbeat\n\n'
        finally:
            broker.unsubscribe(pk, q)

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response
