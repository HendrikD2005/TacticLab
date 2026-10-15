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
    sequence_id: str

class Sequence(BaseModel):
    id: str
    start: float
    end: float
    title: str
    outcome: Literal['escape', 'turnover', 'shot']

class Match(BaseModel):
    id: str
    name: str
    duration: float
    start_minute: int
    sample_hz: int
    players: list[Player]
    times: list[float]
    positions: list[list[list[float]]]
    ball: list[list[float]]
    events: list[Event]
    sequences: list[Sequence]

class AnalysisRequest(BaseModel):
    at: float = Field(ge=0, le=60)
    player_id: int = Field(ge=0, le=21)
    question: Literal['player', 'pressing', 'compare'] = 'pressing'
    language: Literal['de', 'en'] = 'de'

