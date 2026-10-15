"""Bounded synthetic broadcasts with resumable, ordered SSE frame delivery.

Fixtures are generated once. A monotonic clock releases them at 1x; pausing or
reconnecting a viewer never pauses the source. No per-viewer producer queue.
"""
import asyncio
import json
import time
from dataclasses import dataclass
from uuid import UUID
from threading import RLock
from fastapi import HTTPException, Request
from .models import Match

SESSION_TTL = 600.0
MAX_SESSIONS = 64


class StreamSource:
    def __init__(self, match: Match):
        self.match = match
        self.metadata = match.model_dump()
        self.metadata.update(times=match.times[:1], positions=match.positions[:1],
                             ball=match.ball[:1], events=[])
        self.frames = []
        events = sorted(match.events, key=lambda event: (event.time, event.id))
        cursor = 0
        for index, at in enumerate(match.times):
            completed = []
            while cursor < len(events) and events[cursor].time <= at:
                completed.append(events[cursor].model_dump())
                cursor += 1
            payload = dict(index=index, time=at, positions=match.positions[index],
                           ball=match.ball[index], events=completed)
            self.frames.append(f'id: {index}\nevent: frame\ndata: '
                               + json.dumps(payload, separators=(',', ':')) + '\n\n')


@dataclass
class LiveSession:
    id: str
    source: StreamSource
    started: float

    def available_index(self, now: float) -> int:
        return min(len(self.source.frames)-1, max(0, int((now-self.started)*self.source.match.sample_hz)))

    def available_time(self, now: float) -> float:
        return self.source.match.times[self.available_index(now)]


class LiveSessions:
    def __init__(self, matches: dict[str, Match], clock=None):
        self.clock = clock or time.monotonic
        self.lock = RLock()
        self.sources = {key:StreamSource(match) for key,match in matches.items()}
        self.sessions: dict[str, LiveSession] = {}

    def prune(self):
        with self.lock:
            now = self.clock()
            self.sessions = {key:value for key,value in self.sessions.items()
                             if now-value.started < SESSION_TTL}

    def create(self, session_id: UUID, scenario: str) -> LiveSession:
        with self.lock:
            self.prune()
            key = str(session_id)
            if key in self.sessions:
                session = self.sessions[key]
                if session.source.match.scenario != scenario:
                    raise HTTPException(409, 'Session belongs to another scenario')
                return session  # Idempotent bootstrap, including React StrictMode.
            if len(self.sessions) >= MAX_SESSIONS:
                raise HTTPException(429, 'Live simulation capacity reached')
            session = LiveSession(key, self.sources[scenario], self.clock())
            self.sessions[key] = session
            return session

    def get(self, session_id: str) -> LiveSession:
        with self.lock:
            self.prune()
            session = self.sessions.get(session_id)
            if not session:
                raise HTTPException(410, 'Live session expired; start a new simulation')
            return session

    def limit(self, session_id: str | None, scenario: str, at: float) -> float:
        if session_id is None:
            return at
        session = self.get(session_id)
        if session.source.match.scenario != scenario:
            raise HTTPException(409, 'Session belongs to another scenario')
        return min(at, session.available_time(self.clock()))

    def cursor(self, session: LiveSession, after: int, last_event_id: str | None) -> int:
        try:
            cursor = int(last_event_id) if last_event_id is not None else after
        except ValueError:
            raise HTTPException(400, 'Invalid event cursor') from None
        if cursor < 0 or cursor > session.available_index(self.clock()):
            raise HTTPException(409, 'Event cursor outside available history')
        return cursor

    async def stream(self, session: LiveSession, after: int, request: Request):
        yield 'retry: 1000\n\n'
        cursor = after
        last = len(session.source.frames)-1
        while True:
            if await request.is_disconnected():
                return
            now = self.clock()
            if now-session.started >= SESSION_TTL:
                yield 'event: expired\ndata: {}\n\n'
                return
            available = session.available_index(now)
            while cursor < available:
                cursor += 1
                yield session.source.frames[cursor]
                if cursor % 32 == 0:
                    # Fairness during catch-up; no unbounded queue or busy loop.
                    await asyncio.sleep(0)
            if cursor == last:
                yield 'event: complete\ndata: {}\n\n'
                return
            await asyncio.sleep(1/session.source.match.sample_hz)
