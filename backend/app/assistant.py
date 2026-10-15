"""Bounded, deterministic question routing and replay evidence. No model calls."""
import re
from .analysis import snapshot
from .i18n import text as tr

TOPICS = {
    'switch': r'switch|verlager',
    'overload': r'overload|überzahl|ueberzahl|numerical advantage',
    'pressing': r'pressing|pressure|druck',
    'compare': r'compar|vergleich|period|spielphas',
}
KINDS = {'switch': 'switch_of_play', 'overload': 'local_overload', 'pressing': 'pressing_escape'}


def answer(match, request, intelligence):
    query = request.query.strip().casefold()
    named = [p for p in match.players if any(re.search(r'\b'+re.escape(name.casefold())+r'\b', query)
             for name in (p.name, p.name.split()[-1]))] if query else []
    topics = [topic for topic, pattern in TOPICS.items() if re.search(pattern, query)]
    player = named[0] if len(named) == 1 else match.players[request.player_id]
    topic = topics[0] if topics else ('player' if query else request.question)
    unsupported = bool(query) and (len(topics)>1 or len(named)>1 or not (topics or named or re.search(r'player|spieler|pass', query)))
    player_scope = topic != 'compare' and (bool(named) or topic == 'player' or bool(re.search(r'player|spieler', query)))
    facts = snapshot(match, request.at, player.id, intelligence, request.language)
    language = request.language
    fan = request.mode == 'fan'
    def narrative(insight):
        return insight['summary']+' '+tr('fan.'+insight['kind'],language) if fan else insight['explanation']
    timestamp = f'{match.start_minute+int(request.at)//60}:{int(request.at)%60:02d}'
    scope = player.name if player_scope else tr('assistant.scope',language,name='Northbridge' if player.team=='home' else 'Riverside')
    result = dict(source='deterministic', mode=request.mode, text='', event_ids=[], scenes=[], at=request.at,
                  player_id=player.id, language=language, scenario=match.scenario, topic=topic,
                  scope=scope, context=tr('assistant.context',language,time=timestamp,scope=scope), unsupported=unsupported)
    if unsupported:
        result['text'] = tr('assistant.unsupported',language)
        return result, facts, player
    findings = [i for i in facts['insights'] if i['team']==player.team
                and (not player_scope or player.id in i['player_ids'])
                and (topic not in KINDS or i['kind']==KINDS[topic])]
    metrics = facts['player'] if player_scope else facts['team']
    if topic in KINDS:
        if findings:
            latest = findings[-1]
            result['text'] = tr('assistant.count',language,kind=tr('assistant.'+topic,language),count=len(findings),shown=min(4,len(findings)))+' '+narrative(latest)+' '+(tr('fan.caution',language) if fan else latest['limitation'])
        else:
            result['text'] = tr('no_escape',language) if topic=='pressing' else tr('assistant.empty',language,kind=tr('assistant.'+topic,language))
    elif topic=='compare':
        first, second = facts['comparison']
        result['text'] = tr('compare',language,**{f'{period}_{key}':values[key] for period,values in [('first',first),('second',second)] for key in ['completed','attempts','progressive']})
        findings = []
    else:
        result['text'] = tr('fan.metrics' if fan else 'metrics',language,time=timestamp,**metrics)+' '+tr('fan.caution' if fan else 'assistant.sample',language)
        if findings:
            result['text'] += ' '+narrative(findings[-1])
    for insight in reversed(findings[-4:]):
        result['scenes'].append(dict(id=insight['id'], insight_id=insight['id'], at=insight['confirmed_at'],
            start=insight['start'], end=insight['end'], title=insight['title'], reason=narrative(insight),
            player_id=player.id, event_ids=insight['event_ids']))
    # Supplement player/comparison responses with observed passing events, never future events.
    if topic not in KINDS:
        used = {eid for scene in result['scenes'] for eid in scene['event_ids']}
        events = [e for e in match.events if e.time<=request.at and e.id in metrics['event_ids'] and e.id not in used]
        for event in reversed(events):
            if len(result['scenes'])>=6: break
            name = match.players[event.player_id].name
            title = tr('assistant.pass',language,name=name,target=match.players[event.target_id].name if event.target_id is not None else '—',outcome=tr('assistant.success' if event.success else 'assistant.failed',language)) if event.type=='pass' else tr('assistant.event',language,name=name,kind=tr('assistant.'+event.type,language))
            result['scenes'].append(dict(id=event.id,insight_id=None,at=event.time,start=event.release_time,end=event.time,
                title=title,reason=title,player_id=event.player_id,event_ids=[event.id]))
    result['event_ids'] = list(dict.fromkeys(eid for scene in result['scenes'] for eid in scene['event_ids']))
    return result, facts, player
