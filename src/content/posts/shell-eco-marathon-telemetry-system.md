---
title: "Building a Telemetry and Predictive Race Strategy System for a Hydrogen Fuel-Cell Vehicle"
date: "2026-05-01"
description: "Senior capstone write-up on live fuel-cell telemetry, serial monitoring, dashboarding, and burn-and-coast strategy for Swarthmore's Shell Eco-marathon vehicle."
author: "Kimaru Boruett"
category: "Technical"
tags: ["capstone", "telemetry", "hydrogen", "race-strategy", "embedded-systems", "python"]
image: "/assets/images/capstone/telemetry/telemetry-architecture.png"
---

My senior capstone work centered on the electrical and telemetry systems for Swarthmore's hydrogen fuel-cell Shell Eco-marathon prototype. The vehicle problem is deceptively simple: complete a fixed course within a time limit while consuming as little hydrogen as possible. In practice, that becomes a coupled systems problem across fuel-cell limits, driver behavior, track geometry, motor capability, data acquisition, and real-time decision support.

The telemetry system was designed around two complementary goals. The first was **live monitoring**: capture fuel-cell and vehicle-state data, decode it reliably, log it, and present it on a dashboard that a pit team could read during testing. The second was **predictive strategy**: turn track geometry and vehicle parameters into a burn-and-coast plan that estimates speed, energy use, and timing margin before the car ever runs a lap.

<figure>
  <img src="/assets/images/capstone/telemetry/telemetry-architecture.png" alt="Telemetry architecture diagram" />
  <figcaption>Integrated telemetry architecture: fuel-cell, IMU, GPS, and driver signals flow through serial acquisition and a Flask/Socket.IO dashboard.</figcaption>
</figure>

## Live Monitoring

The live telemetry stack reads serial packets from the fuel-cell subsystem, decodes the raw stream into structured values, and broadcasts normalized JSON payloads to a web dashboard. The dashboard is served by Flask and Socket.IO so the pit display can update continuously as new packets arrive.

I designed the data path to keep raw logging and live visualization separate. Raw packets are retained as JSON Lines logs for later analysis, while the frontend receives cleaned measurements for gauges, time-series plots, and fault visibility. This makes bench testing useful even before full vehicle integration: simulated packet streams can exercise the same dashboard code that later receives live hardware data.

<figure>
  <img src="/assets/images/capstone/telemetry/real-time-dashboard/real-time-dashboard.png" alt="Real-time telemetry dashboard" />
  <figcaption>Real-time dashboard used for fuel-cell and vehicle-state monitoring during bench validation.</figcaption>
</figure>

<figure>
  <img src="/assets/images/capstone/telemetry/real-time-dashboard/dedicated-fuel-stack-plots.png" alt="Fuel stack plots" />
  <figcaption>Dedicated fuel-stack plots make voltage, current, temperature, and runtime behavior easier to inspect during tests.</figcaption>
</figure>

## Predictive Strategy

The predictive side models the course in the spatial domain. Track points are resampled by cumulative distance, then used to estimate grade, curvature, and local speed constraints. With those track features in place, the simulation applies a lightweight longitudinal model: aerodynamic drag, rolling resistance, grade resistance, motor/fuel-cell power limits, and cornering constraints.

The strategy output is a burn-and-coast schedule. Rather than commanding constant speed, the car accelerates in selected regions, coasts where that saves energy, and preserves enough average speed to satisfy the Shell Eco-marathon time requirement. This is important because driving as slowly as possible is not the objective. The car must finish inside the time window while minimizing traction energy.

<figure>
  <img src="/assets/images/capstone/telemetry/race-strategy/trackmap.png" alt="Track map" />
  <figcaption>Track map used by the strategy engine to align simulation state with course geometry.</figcaption>
</figure>

<figure>
  <img src="/assets/images/capstone/telemetry/race-strategy/speed-profile.png" alt="Speed profile" />
  <figcaption>Predicted speed profile from the burn-and-coast strategy engine.</figcaption>
</figure>

<figure>
  <img src="/assets/images/capstone/telemetry/race-strategy/fuel-cell-demand-cumulative-energy.png" alt="Fuel-cell demand and cumulative energy" />
  <figcaption>Fuel-cell demand and cumulative traction energy help compare strategy choices before track testing.</figcaption>
</figure>

## Why the Two Halves Belong Together

The predictive engine tells the team what should happen. The telemetry system tells the team what is happening. Keeping those systems connected creates a feedback loop: simulation informs the first plan, live data exposes deviations, and post-run logs make it possible to tune vehicle parameters, driver cues, and future strategies.

The project also forced useful engineering discipline. A model that cannot be explained is hard to trust during race operations; a dashboard that cannot preserve raw data is hard to debug after testing. The final architecture therefore favors interpretable physics, explicit assumptions, simple deployment, and logs that can be reanalyzed outside the dashboard.

## Documentation

- Project page: [Shell Eco-marathon Telemetry and Race Strategy](/projects/shell-eco-marathon-telemetry-and-race-strategy)
- Final report: [E90_Final_Report.pdf](/resources/capstone/E90_Final_Report.pdf)
- Final presentation: [E90_Final_Presentation.pdf](/resources/capstone/E90_Final_Presentation.pdf)
- Static simulator bundle: [race-strategy-simulator](/resources/capstone/race-strategy-simulator/index.html)

