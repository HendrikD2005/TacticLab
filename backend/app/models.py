from uuid import UUID, uuid4
from typing import Literal
from pydantic import BaseModel, Field

class Player(BaseModel):
    id: int
    number: int
    name: str
    team: Literal['home', 'away']
    role: str

class Event(BaseModel):
    id: str
    time: float
    release_time: float
    type: Literal['pass', 'turnover', 'shot']
    player_id: int
    target_id: int | None = None
    x: float
    y: float
    end_x: float
    end_y: float
    success: bool
    under_pressure: bool
    sequence_id: str | None = None

class Match(BaseModel):
    id: str
    scenario: Literal['standard', 'variation', 'control', 'tactics'] = 'standard'
    name: str
    duration: float
    start_minute: int
    initial_player_id: int | None = None
    sample_hz: int
    players: list[Player]
    times: list[float]
    positions: list[list[list[float]]]
    ball: list[list[float]]
    events: list[Event]

class LiveRequest(BaseModel):
    scenario: Literal['standard', 'variation', 'control', 'tactics'] = 'standard'
    session_id: UUID = Field(default_factory=uuid4)

class AnalysisRequest(BaseModel):
    session_id: UUID | None = None
    scenario: Literal['standard', 'variation', 'control', 'tactics'] = 'standard'
    at: float = Field(ge=0, le=60)
    player_id: int = Field(ge=0, le=21)
    question: Literal['player', 'pressing', 'compare', 'switch', 'overload', 'recap'] = 'pressing'
    mode: Literal['analyst', 'fan'] = 'analyst'
    query: str = Field(default='', max_length=240)
    language: Literal['de', 'en'] = 'en'

