# Metric definitions and limitations

Field coordinates are metres on 105 x 68. Northbridge attacks toward increasing x; Riverside toward decreasing x. Directions do not switch in this one-minute second-half fixture.

- Pass attempt: a completed pass event, including unsuccessful attempts. It enters statistics at the completion timestamp.
- Accuracy: successful pass events / attempts. No attempts gives null (UI shows an em dash), not zero.
- Progressive pass: a successful pass with signed x gain >=10 m. This is a transparent prototype definition, not an industry-standard scouting score.
- Pressure: nearest opponent within 12 m of the passer at release (computed from flight distance). This generous synthetic threshold is illustrative and not calibrated against real tracking data.
- Success under pressure: completed pressured passes / pressured attempts. It does not claim a whole pressing escape.
- Distance: Euclidean pass displacement, in metres, summed over completed passes.
- Comparison: two equal time intervals from replay start to the selected timestamp. The boundary event is counted exactly once.
- Pressure escapes are derived from tracking, pass outcomes and possession; no authored scene labels are used. The detector is deterministic, not a trained model.

Data generation is seeded, with 22 tracking positions at 10 Hz. Players steer toward support positions with a maximum target speed of 6.5 m/s and acceleration capped at 4 m/s². Pass flight time is calculated from distance at an illustrative 16 m/s. These are simulation parameters, not claims calibrated against professional match data. The original three scenarios contain seventeen passes in 60 seconds; the tactical-pattern scenario contains nine more widely spaced passes. Explicit linking passes connect the possession chain; failed passes transfer control to the receiving opponent. Between flights the ball follows the current owner. Tests verify tracking bounds, speed/acceleration limits, ball continuity and flight duration. There is no full football physics or possession engine. xG, causal claims and pass difficulty are not presented as computed metrics.

The scoreboard is scenario metadata and does not describe a goal inside the one-minute slice. No real match or personal data is used.



## Possession and pressure escapes (v1)

Initial ownership is explicit match metadata; absent metadata means unknown possession until the first observed action. Release changes state to `in_flight` (no individual owner); reception changes it to `controlled`. An opponent reception starts a new team possession phase. An unresolved reception is `loose`. Team attribution during flight describes the passing phase, not proven individual control. Returning possession after a loss does not restore the original phase.

A successful pass qualifies only when all conditions hold:

1. At release, the nearest opponent is at most 10 m away.
2. The pass gains at least 10 m in the team's attacking direction.
3. At least one opponent inside that pressure radius is ahead of the ball at release and at least 2 m behind the received ball at reception, using that opponent's actual positions at both times.
4. The nearest opponent at reception is at least 8 m away, and that distance improves by at least 2 m compared with release.
5. Two seconds after reception, the same team possession phase still exists and the ball is controlled. If it is in flight, lost, or the fixture ends too soon, no insight is confirmed.

The insight becomes visible only at reception + 2 s. The overlay records the historical pass endpoints and bypassed opponents, rather than implying those positions are current. References identify the source pass and possession phase. Confirmation may be conservative when another pass is in flight.

Thresholds are uncalibrated prototype heuristics. A longitudinally bypassed nearby opponent is not proof that an entire pressing line was beaten. This version detects single-pass escapes, not multi-pass combinations, tactical intent or causality. Synthetic pass labels and `under_pressure` flags do not control the escape detector.


## Switch of play (v1)

A successful pass must connect opposite outer thirds of the 68 m pitch (y <= 68/3 and y >= 2*68/3), cover at least 34 m laterally, lose no more than 10 m longitudinally in the attacking direction, and arrive at least 8 m from the nearest opponent. Same-phase controlled possession must still exist two seconds after reception. The finding is released only then. Evidence gives lateral displacement, Euclidean pass length and receiving space; the overlay shows historical release/reception endpoints.

This is a conservative single-pass heuristic. Central-to-wide circulation and multi-pass switches are outside scope; a cross-field pass does not prove tactical intent, an effective defensive shift or a scoring chance. Directions are mirrored for the away team.

## Local overload (v1)

After a successful reception, anchor a fixed 15 m radius at the reception point. For two seconds, examine every tracking timestamp, each possession transition and both interval endpoints. At every checked instant:

- At least three teammates and one opponent are inside the zone, and teammates outnumber opponents.
- The ball carrier is controlled, remains within the zone and belongs to the same possession phase.

A tie, a temporary dip in numbers, a flight, loss/regain or a carrier leaving the zone rejects that candidate. An incomplete interval at match end cannot confirm a finding. The displayed count is the count at confirmation; a separate metric gives the smallest numerical advantage across the entire sampled window. Player focus includes the attacking players counted at confirmation. The historical overlay records the fixed circle and all counted players' positions at confirmation, with green attacker rings and blue defender rings. It does not track those historical markers forward in time.

Within one phase, candidates less than eight seconds after an already emitted overload are suppressed if their zones overlap (centres less than 30 m apart). Spatially separate situations remain eligible.

This is a local headcount, including the carrier and any goalkeeper inside the radius. It does not evaluate passing lanes, cover shadows, offside, player orientation, marking quality or effective tactical superiority. Sampling cannot establish continuous control between tracking observations. Detection is triggered by receptions, not by every off-ball cluster.

## Demonstration scenario

`generate_tactical_match()` supplies a reproducible formation and a continuous nine-pass possession chain with bounded movement and distance-derived flight time. Detectors do not read scenario names or event annotations. The first switch is received at 9 s and confirmed at 11 s; the first 3 v 2 is received at 16 s and confirmed at 18 s. Later overloads confirm at 31 s and 52 s. Independent positive/negative fixtures test the rules separately from this demonstration.

New tactical confirmation is aligned to the first available tracking sample at or after reception + 2 s. The evidence reports the actual observed interval. This avoids using a future interpolation endpoint for off-grid event timestamps.
