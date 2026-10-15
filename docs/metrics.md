# Metric definitions and limitations

Field coordinates are metres on 105 x 68. Northbridge attacks toward increasing x; Riverside toward decreasing x. Directions do not switch in this one-minute second-half fixture.

- Pass attempt: a completed pass event, including unsuccessful attempts. It enters statistics at the completion timestamp.
- Accuracy: successful pass events / attempts. No attempts gives null (UI shows an em dash), not zero.
- Progressive pass: a successful pass with signed x gain >=10 m. This is a transparent prototype definition, not an industry-standard scouting score.
- Pressure: nearest opponent within 12 m of the passer at release (computed from flight distance). This generous synthetic threshold is illustrative and not calibrated against real tracking data.
- Success under pressure: completed pressured passes / pressured attempts. It does not claim a whole pressing escape.
- Distance: Euclidean pass displacement, in metres, summed over completed passes.
- Comparison: two equal time intervals from replay start to the selected timestamp. The boundary event is counted exactly once.
- Key sequences and outcomes are scenario annotations, revealed after their completion. They are not detected by a trained model.

Data generation is seeded, with 22 tracking positions at 10 Hz. Players steer toward support positions with a maximum target speed of 6.5 m/s and acceleration capped at 4 m/s². Pass flight time is calculated from distance at an illustrative 16 m/s. These are simulation parameters, not claims calibrated against professional match data. Fourteen passes occupy a 60-second replay. Between independent sequences, synthetic ball transitions are interpolated continuously and are not counted as recorded passes. Tests verify tracking bounds, speed/acceleration limits, ball continuity and flight duration. There is no full football physics or possession engine. xG, causal claims and pass difficulty are not presented as computed metrics.

The scoreboard is scenario metadata and does not describe a goal inside the one-minute slice. No real match or personal data is used.

