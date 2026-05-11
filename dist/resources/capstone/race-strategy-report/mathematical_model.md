# Mathematical Model Enrichment

## Core longitudinal balance
A stronger final report should write the model in the space domain rather than only in the time domain. This keeps the formulation aligned with track position, corner markers, and lap segmentation.

\[
rac{dv}{ds} = rac{1}{m v}\left(F_{\mathrm{drive}} - F_{\mathrm{aero}} - F_{\mathrm{roll}} - F_{\mathrm{grade}}ight)
\]

with

\[
F_{\mathrm{aero}} = 	frac{1}{2}ho C_d A v^2,
\qquad
F_{\mathrm{roll}} = m g C_{rr}\cos	heta,
\qquad
F_{\mathrm{grade}} = m g \sin	heta
\]

and \(	heta = rctan(\mathrm{grade})\).

## Cornering constraint
For track curvature \(\kappa(s)\), impose

\[
v(s) \le \sqrt{rac{a_{y,\max}}{\kappa(s)}}
\]

and then clip by an absolute safety ceiling.

## Fuel-cell and motor constraints
A richer capstone should separate three limits:

1. Fuel-cell preferred continuous power.
2. Fuel-cell peak usable power.
3. Wheel hub motor force or torque limit at low speed.

Use

\[
F_{\mathrm{drive}}(v) = \min\left(F_{\max}, rac{P_{\max}}{\max(v, v_\epsilon)}ight)
\]

## Energy objective
Fuel-cell electrical energy should be integrated as

\[
E = \int_0^{L} rac{P_{\mathrm{mech}}(s)}{\eta_{\mathrm{drive}}\,v(s)}\,ds
\]

Then convert to hydrogen mass estimate using fuel-cell system efficiency \(\eta_{fc}\) and hydrogen lower heating value \(LHV_{H_2}\):

\[
m_{H_2} = rac{E}{\eta_{fc} LHV_{H_2}}
\]

## Hybrid strategy formulation
Your report becomes much richer if it compares three levels of strategy:

- rule-based burn/coast controller
- tuned heuristic schedule with lookahead
- optimization benchmark such as dynamic programming or direct collocation

That gives you both an implementable race-day tool and a higher-rigor benchmark.

## Modifications that make the project stronger

1. Add Monte Carlo uncertainty on wind, driver reaction lag, and sensor noise.
2. Add parameter identification from coast-down experiments.
3. Add thermal derating and fuel-cell power slew limits.
4. Add segment-level cost decomposition: aero, rolling, climbing, cornering, traction electric demand.
5. Add a Pareto study of time margin versus hydrogen mass.
6. Add a benchmark optimizer to compare against the online controller.
