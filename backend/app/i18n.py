"""Request-scoped text formatting. Shared match indices remain language-neutral."""
import json
from pathlib import Path
from typing import Literal

Language = Literal['en', 'de']
ROOT = Path(__file__).resolve().parent / 'locales'
CATALOGS = {language:json.loads((ROOT/f'{language}.json').read_text(encoding='utf-8'))
            for language in ('en', 'de')}


def text(key: str, language: Language = 'en', **values) -> str:
    def formatted(value):
        if isinstance(value, float):
            result = f'{value:g}'
            return result.replace('.', ',') if language == 'de' else result
        return value
    template = CATALOGS.get(language, CATALOGS['en']).get(key, CATALOGS['en'][key])
    return template.format(**{key:formatted(value) for key,value in values.items()})


def localize_insight(insight: dict, players: dict, language: Language) -> dict:
    evidence = insight['evidence']
    if insight['kind'] == 'switch_of_play':
        return {**insight, 'title':text('switch.title',language),
            'summary':text('switch.summary',language,passer=players[insight['player_ids'][0]].name,receiver=players[insight['player_ids'][1]].name),
            'explanation':text('switch.explanation',language,**evidence),
            'limitation':text('switch.limitation',language)}
    if insight['kind'] == 'local_overload':
        return {**insight, 'title':text('overload.title',language),
            'summary':text('overload.summary',language,**evidence),
            'explanation':text('overload.explanation',language,**evidence),
            'limitation':text('overload.limitation',language)}
    return {**insight,
        'title':text('escape.title', language),
        'summary':text('escape.summary', language, passer=players[insight['player_ids'][0]].name,
                       receiver=players[insight['player_ids'][1]].name),
        'explanation':text('escape.explanation', language, before=evidence['pressure_before_m'],
                           after=evidence['space_after_m'], gain=evidence['gain_m'],
                           bypassed=evidence['bypassed'], retained=evidence['retained_s']),
        'limitation':text('escape.limitation', language),
    }
