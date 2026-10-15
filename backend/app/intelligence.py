"""Deterministic, time-causal possession and single-pass pressure escape detection.

Thresholds are transparent prototype heuristics, not a calibrated tactical model.
The index is built once per match; requests only select already-confirmed findings.
"""
from bisect import bisect_right
from math import hypot
from .models import Match

PRESSURE_M = 10.0
SPACE_M = 8.0
RELIEF_M = 2.0
GAIN_M = 10.0
HOLD_S = 2.0


class MatchIntelligence:
    def __init__(self, match: Match):
        self.match = match
        self.players = {p.id: p for p in match.players}
        self.indices = {p.id: i for i, p in enumerate(match.players)}
        self.events = sorted(match.events, key=lambda e: (e.release_time, e.time, e.id))
        self.states = []
        self.insights = []
        self._build_possession()
        self.state_times = [s['since'] for s in self.states]
        self._detect()
        self.insight_times = [i['confirmed_at'] for i in self.insights]

    def point(self, at, player):
        # Interpolate actual timestamps, including irregular tracking samples.
        m = self.match
        k = max(0, min(bisect_right(m.times, at)-1, len(m.times)-2))
        f = max(0, min(1, (at-m.times[k])/(m.times[k+1]-m.times[k])))
        a, b = m.positions[k][self.indices[player]], m.positions[k+1][self.indices[player]]
        return [a[d]+(b[d]-a[d])*f for d in (0, 1)]

    def _build_possession(self):
        phase, team, owner, phase_start = 0, None, None, 0.0
        self.states.append(dict(since=0.0, phase_id=0, phase_start=0.0,
                                team=None, player_id=None, status='unknown'))
        previous_end = -1.0
        for e in self.events:
            if e.release_time < previous_end or e.time < e.release_time:
                raise ValueError('Events must not overlap')
            previous_end = e.time
            if e.player_id not in self.players or (e.target_id is not None and e.target_id not in self.players):
                raise ValueError('Unknown player')
            passing_team = self.players[e.player_id].team
            if e.type == 'pass' and e.target_id is not None:
                same = self.players[e.target_id].team == passing_team
                if e.success != same:
                    raise ValueError('Pass success and receiving team disagree')
            if owner is not None and owner != e.player_id:
                raise ValueError('Passer does not own the ball')
            if team != passing_team:
                phase += 1
                team, phase_start = passing_team, e.release_time
            self.states.append(dict(since=e.release_time, phase_id=phase, phase_start=phase_start,
                                    team=team, player_id=None, status='in_flight'))
            owner = e.target_id
            receiving_team = self.players[owner].team if owner is not None else None
            if receiving_team != team:
                phase += 1
                team, phase_start = receiving_team, e.time
            self.states.append(dict(since=e.time, phase_id=phase, phase_start=phase_start,
                                    team=team, player_id=owner,
                                    status='controlled' if owner is not None else 'loose'))
        # Initial owner is explicit fixture metadata, not inferred from future events.
        if self.match.initial_player_id is not None:
            initial = self.players[self.match.initial_player_id]
            if self.events and initial.id != self.events[0].player_id:
                raise ValueError('Initial owner and first passer disagree')
            self.states[0].update(team=initial.team, player_id=initial.id, status='controlled',
                                  phase_id=1, phase_start=0.0)
            # First possession starts at kickoff rather than the first pass release.
            for state in self.states[1:]:
                if state['phase_id'] == 1:
                    state['phase_start'] = 0.0

    def possession(self, at):
        state = self.states[max(0, bisect_right(self.state_times, at)-1)]
        return {**state, 'at': at, 'duration': round(at-state['phase_start'], 2)}

    def _detect(self):
        for e in self.events:
            if e.type != 'pass' or not e.success or e.target_id is None:
                continue
            confirmed = e.time + HOLD_S
            if confirmed > self.match.duration:
                continue
            received = self.possession(e.time)
            retained = self.possession(confirmed)
            if retained['phase_id'] != received['phase_id'] or retained['status'] != 'controlled':
                continue
            team = self.players[e.player_id].team
            direction = 1 if team == 'home' else -1
            gain = (e.end_x-e.x)*direction
            if gain < GAIN_M:
                continue
            opponents = [p.id for p in self.match.players if p.team != team]
            starts = {p: self.point(e.release_time, p) for p in opponents}
            ends = {p: self.point(e.time, p) for p in opponents}
            distances = {p: hypot(x-e.x, y-e.y) for p, (x, y) in starts.items()}
            if not distances:
                continue
            before = min(distances.values())
            after = min(hypot(x-e.end_x, y-e.end_y) for x, y in ends.values())
            bypassed = [p for p in opponents if distances[p] <= PRESSURE_M
                        and (starts[p][0]-e.x)*direction > 0
                        and (e.end_x-ends[p][0])*direction >= 2]
            if before > PRESSURE_M or after < SPACE_M or after-before < RELIEF_M or not bypassed:
                continue
            name = self.players[e.player_id].name
            receiver = self.players[e.target_id].name
            evidence = dict(gain_m=round(gain, 1), pressure_before_m=round(before, 1),
                            space_after_m=round(after, 1), bypassed=len(bypassed), retained_s=HOLD_S)
            self.insights.append(dict(
                id='escape-'+e.id, kind='pressing_escape', start=e.release_time, end=e.time,
                confirmed_at=confirmed, team=team, phase_id=received['phase_id'],
                player_ids=[e.player_id, e.target_id], event_ids=[e.id], evidence=evidence,
                title='Pressingdurchbruch',
                summary=f'{name} findet {receiver} hinter dem Druck. Das Team gewinnt Raum und sichert den Ball.',
                explanation=f'{before:.1f} m Gegnerabstand beim Abspiel, {gain:.1f} m Raumgewinn '
                            f'und {after:.1f} m Freiraum bei der Annahme. Überspielte Druckspieler: '
                            f'{len(bypassed)}. Nach {HOLD_S:g} Sekunden weiterhin kontrollierter Teamballbesitz.',
                limitation='Regelbasierter Hinweis aus synthetischen Positionsdaten; keine Aussage über Absicht oder eine komplette Pressinglinie.',
                overlay=dict(start=[e.x,e.y], end=[e.end_x,e.end_y],
                             opponents=[dict(id=p, start=starts[p], end=ends[p]) for p in bypassed]),
            ))
        self.insights.sort(key=lambda i: (i['confirmed_at'], i['id']))

    def snapshot(self, at):
        visible = self.insights[:bisect_right(self.insight_times, at)]
        return dict(possession=self.possession(at), insights=visible)
