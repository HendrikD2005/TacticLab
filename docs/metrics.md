# Metric definitions and limitations

Field coordinates are metres on 105 x 68. Northbridge attacks toward increasing x; Riverside toward decreasing x. Directions do not switch in this two-minute second-half fixture.

- Pass attempt: a completed pass event, including unsuccessful attempts. It enters statistics at the completion timestamp.
- Accuracy: successful pass events / attempts. No attempts gives null (UI shows an em dash), not zero.
- Progressive pass: a successful pass with signed x gain >=10 m. This is a transparent prototype definition, not an industry-standard scouting score.
- Pressure: nearest opponent within 12 m of the passer at release (two seconds before completion). This generous synthetic threshold is illustrative and not calibrated against real tracking data.
- Success under pressure: completed pressured passes / pressured attempts. It does not claim a whole pressing escape.
- Distance: Euclidean pass displacement, in metres, summed over completed passes.
- Comparison: two equal time intervals from replay start to the selected timestamp. The boundary event is counted exactly once.
- Key sequences and outcomes are scenario annotations, revealed after their completion. They are not detected by a trained model.

Data generation is seeded, with 22 tracking positions at 2 Hz. Ball travel during a pass interpolates release to reception over two seconds. Between separate constructed sequences, possession can reset; there is no full football simulation, continuous possession engine, speed validation or physical ball model. Player speed, xG, causal claims and pass difficulty are deliberately not presented as computed metrics.

The scoreboard is scenario metadata and does not describe a goal inside the two-minute slice. No real match or personal data is used.
