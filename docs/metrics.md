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

Data generation is seeded, with 22 tracking positions at 10 Hz. Players steer toward support positions with a maximum target speed of 6.5 m/s and acceleration capped at 4 m/s². Pass flight time is calculated from distance at an illustrative 16 m/s. These are simulation parameters, not claims calibrated against professional match data. Seventeen passes occupy a 60-second replay. Explicit linking passes connect the possession chain; failed passes transfer control to the receiving opponent. Between flights the ball follows the current owner. Tests verify tracking bounds, speed/acceleration limits, ball continuity and flight duration. There is no full football physics or possession engine. xG, causal claims and pass difficulty are not presented as computed metrics.

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
