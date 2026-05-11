# Capstone Report Template: Hydrogen Fuel-Cell Burn-and-Coast Race Strategy

## 1. Executive summary
State the problem, race context, vehicle architecture, and headline result.

## 2. Engineering motivation
Explain why strategy matters for a hydrogen fuel-cell vehicle with a wheel hub motor.
Discuss endurance constraints, minimum average speed, cornering losses, grade effects, and driver workload.

## 3. System architecture
- Hydrogen fuel cell
- Separate accessories battery for horn, live telemetry, and driver dashboard
- Wheel hub motor
- Track geometry pipeline
- Offline optimizer
- GitHub Pages engineering dashboard

## 4. Vehicle and track modeling
Summarize mass properties, drag, rolling resistance, propulsion limits, and track discretization.

## 5. Mathematical formulation
Reference `mathematical_model.md` and derive:
- space-domain longitudinal dynamics
- curvature-based speed constraints
- burn/coast switching logic
- event time constraint
- energy and hydrogen consumption objective

## 6. Calibration and identification
Describe coast-down testing, drag fitting, rolling resistance estimation, and telemetry-based correction.

## 7. Strategy synthesis
Show how the controller chooses when to burn and when to coast.
Include rationale for pre-corner coasting and post-corner re-acceleration.

## 8. Interactive simulator
Describe the web interface, parameter controls, selectable tracks, and engineering plots.

## 9. Results
Include:
- speed vs. distance
- power vs. distance
- cumulative energy
- map colored by speed
- sensitivity sweeps for mass, CdA, Crr, and power ceilings

## 10. Validation
Compare simulation with measured telemetry and discuss residuals.

## 11. Limitations
List simplifying assumptions and what remains to be modeled.

## 12. Future work
- stochastic wind model
- driver actuation error model
- fuel-cell efficiency map
- battery hybrid buffer
- optimal control / dynamic programming benchmark

## 13. Conclusion
Summarize the strategy insight and why the tool is useful beyond one event.
