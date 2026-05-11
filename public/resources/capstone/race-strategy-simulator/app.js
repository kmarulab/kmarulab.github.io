const g = 9.81;
const rhoAir = 1.225;
const uploadedOptionValue = '__uploaded_track__';
const appVersion = '2026-04-15-4';
const docsBaseUrl = new URL('./', window.location.href);

let lastRun = null;
let uploadedTrack = null;
let trackCatalog = [];
let boundarySelection = {
  trackKey: null,
  startIndex: 0,
  finishIndex: 0,
  pendingSelection: null
};

const paceBiasInput = document.getElementById('paceBias');
const paceBiasValue = document.getElementById('paceBiasValue');
const trackSelect = document.getElementById('trackSelect');
const trackUpload = document.getElementById('trackUpload');
const trackStatus = document.getElementById('trackStatus');
const boundaryStatus = document.getElementById('boundaryStatus');
const setLoopBtn = document.getElementById('setLoopBtn');
const setStartBtn = document.getElementById('setStartBtn');
const setFinishBtn = document.getElementById('setFinishBtn');
const resetBoundaryBtn = document.getElementById('resetBoundaryBtn');

if (paceBiasInput && paceBiasValue) {
  paceBiasInput.addEventListener('input', (e) => {
    paceBiasValue.textContent = Number(e.target.value).toFixed(2);
  });
}

document.getElementById('runBtn')?.addEventListener('click', runScenario);
document.getElementById('downloadBtn')?.addEventListener('click', downloadResults);
trackSelect?.addEventListener('change', () => {
  if (trackSelect.value !== uploadedOptionValue) {
    updateTrackStatus('Running with bundled track data.');
  }
  runScenario();
});
trackUpload?.addEventListener('change', handleTrackUpload);
setLoopBtn?.addEventListener('click', () => setBoundarySelectionMode('loop'));
setStartBtn?.addEventListener('click', () => setBoundarySelectionMode('start'));
setFinishBtn?.addEventListener('click', () => setBoundarySelectionMode('finish'));
resetBoundaryBtn?.addEventListener('click', () => resetBoundarySelection(true));
window.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
  if (!trackSelect || !trackStatus || !paceBiasInput || !paceBiasValue || !boundaryStatus) {
    console.warn('Race Strategy Lab could not initialize because required controls are missing from the page.');
    return;
  }
  paceBiasValue.textContent = Number(paceBiasInput.value).toFixed(2);
  updateBoundaryControls();
  await populateTrackSelect();
  await runScenario();
}

async function populateTrackSelect() {
  const fallbackTracks = [
    { label: 'SEM 2023 Track Data', path: 'tracks/sem_2023.json', kind: 'bundled' },
    { label: 'SEM Speedway Demo', path: 'tracks/sem_speedway_demo.json', kind: 'bundled' },
    { label: 'Technical Infield Demo', path: 'tracks/technical_infield_demo.json', kind: 'bundled' }
  ];

  try {
    const response = await fetch(resolveAssetUrl('tracks/manifest.json'), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Track manifest request failed with ${response.status}`);
    }
    trackCatalog = await response.json();
  } catch (error) {
    console.warn('Falling back to static track list:', error);
    trackCatalog = fallbackTracks;
  }

  trackSelect.innerHTML = trackCatalog.map(track => `
    <option value="${track.path}">${track.label}</option>
  `).join('');

  const preferredTrack = trackCatalog.find(track => track.kind === 'generated')
    || trackCatalog.find(track => !String(track.path).includes('_demo'))
    || trackCatalog[0];

  if (preferredTrack) {
    trackSelect.value = preferredTrack.path;
    const sourceNote = preferredTrack.source_csv ? ` Generated from ${preferredTrack.source_csv}.` : '';
    updateTrackStatus(`Loaded bundled track: ${preferredTrack.label}.${sourceNote}`);
  }
}

async function handleTrackUpload(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    uploadedTrack = buildTrackFromCsvText(text, file.name.replace(/\.csv$/i, ''));
    const previousTrack = trackSelect.value && trackSelect.value !== uploadedOptionValue
      ? await loadTrackFromPath(trackSelect.value)
      : null;
    const previousMeta = trackCatalog.find(track => track.path === trackSelect.value);
    const sameSourceCsv = previousMeta?.source_csv && normalizeHeader(previousMeta.source_csv) === normalizeHeader(file.name);
    const sameAsCurrentBundledTrack = Boolean(sameSourceCsv || (previousTrack && tracksEquivalent(uploadedTrack, previousTrack)));

    let uploadedOption = trackSelect.querySelector(`option[value="${uploadedOptionValue}"]`);
    if (!uploadedOption) {
      uploadedOption = document.createElement('option');
      uploadedOption.value = uploadedOptionValue;
      trackSelect.prepend(uploadedOption);
    }
    uploadedOption.textContent = `Uploaded: ${file.name}`;
    trackSelect.value = uploadedOptionValue;

    const summary = `Uploaded ${file.name}. Track length ${uploadedTrack.length_m.toFixed(1)} m across ${uploadedTrack.distance_m.length} resampled points.`;
    if (sameAsCurrentBundledTrack) {
      const bundledLabel = previousMeta?.label || previousTrack.name || 'the current bundled track';
      updateTrackStatus(`${summary} It matches ${bundledLabel}, so the maps and plots may look unchanged.`);
    } else {
      updateTrackStatus(summary);
    }
    await runScenario();
  } catch (error) {
    console.error(error);
    updateTrackStatus(`Could not parse ${file.name}: ${error.message}`);
  }
}

async function runScenario() {
  try {
    const { track, trackKey } = await loadActiveTrack();
    if (!track) {
      updateTrackStatus('No track is available yet. Upload a CSV or add a bundled JSON track.');
      return;
    }

    ensureBoundarySelection(trackKey, track);
    const params = readParams();
    const lapTrack = buildConfiguredTrack(track, boundarySelection.startIndex, boundarySelection.finishIndex);
    const tiledTrack = tileTrack(lapTrack, params.eventDistance);
    const result = simulateBurnAndCoast(tiledTrack, params);
    lastRun = {
      params,
      baseTrack: track,
      lapTrack,
      simTrack: tiledTrack,
      result,
      boundarySelection: { ...boundarySelection }
    };
    renderAll(lastRun);
  } catch (error) {
    console.error(error);
    updateTrackStatus(`Simulation failed: ${error.message}`);
  }
}

async function loadActiveTrack() {
  if (trackSelect.value === uploadedOptionValue) {
    return {
      track: uploadedTrack,
      trackKey: `uploaded:${uploadedTrack?.name || 'track'}`
    };
  }
  if (!trackSelect.value) {
    return { track: null, trackKey: null };
  }
  return {
    track: await loadTrackFromPath(trackSelect.value),
    trackKey: `bundled:${trackSelect.value}`
  };
}

function updateTrackStatus(message) {
  trackStatus.textContent = message;
}

function ensureBoundarySelection(trackKey, track) {
  if (boundarySelection.trackKey === trackKey) {
    updateBoundaryControls(track);
    return;
  }

  boundarySelection = {
    trackKey,
    startIndex: 0,
    finishIndex: 0,
    pendingSelection: null
  };
  updateBoundaryControls(track);
}

function resetBoundarySelection(rerun = false) {
  boundarySelection.startIndex = 0;
  boundarySelection.finishIndex = 0;
  boundarySelection.pendingSelection = null;
  updateBoundaryControls(lastRun?.baseTrack);
  if (rerun) {
    runScenario();
  }
}

function setBoundarySelectionMode(mode) {
  boundarySelection.pendingSelection = boundarySelection.pendingSelection === mode ? null : mode;
  updateBoundaryControls(lastRun?.baseTrack);
}

function updateBoundaryControls(track = null) {
  setLoopBtn?.classList.toggle('is-active', boundarySelection.pendingSelection === 'loop');
  setStartBtn?.classList.toggle('is-active', boundarySelection.pendingSelection === 'start');
  setFinishBtn?.classList.toggle('is-active', boundarySelection.pendingSelection === 'finish');

  if (!boundaryStatus) {
    return;
  }

  if (!track) {
    boundaryStatus.textContent = 'Start/finish editing is off. Choose a boundary button, then click a point on the track map.';
    return;
  }

  const startDistance = track.distance_m?.[boundarySelection.startIndex] ?? 0;
  const finishDistance = track.distance_m?.[boundarySelection.finishIndex] ?? 0;
  const isFullLoop = boundarySelection.startIndex === boundarySelection.finishIndex;
  const modeHint = boundarySelection.pendingSelection === 'start'
    ? ' Click the track map to place a new start point.'
    : boundarySelection.pendingSelection === 'loop'
      ? ' Click the track map to place the full-loop start/finish point.'
    : boundarySelection.pendingSelection === 'finish'
      ? ' Click the track map to place a new finish point.'
      : '';

  boundaryStatus.textContent = isFullLoop
    ? `Boundary is a full loop starting at ${startDistance.toFixed(1)} m.${modeHint}`
    : `Boundary runs from ${startDistance.toFixed(1)} m to ${finishDistance.toFixed(1)} m along the selected direction.${modeHint}`;
}

async function loadTrackFromPath(trackPath) {
  const response = await fetch(resolveAssetUrl(trackPath), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not load ${trackPath}`);
  }
  return response.json();
}

function readParams() {
  return {
    eventDistance: Number(document.getElementById('eventDistance').value),
    timeLimit: Number(document.getElementById('timeLimit').value),
    mass: Number(document.getElementById('mass').value),
    cda: Number(document.getElementById('cda').value),
    crr: Number(document.getElementById('crr').value),
    motorPower: Number(document.getElementById('motorPower').value),
    fcPreferred: Number(document.getElementById('fcPreferred').value),
    fcPeak: Number(document.getElementById('fcPeak').value),
    latAccel: Number(document.getElementById('latAccel').value),
    speedCap: Number(document.getElementById('speedCap').value),
    burnOnThreshold: Number(document.getElementById('burnOnThreshold').value),
    burnOffThreshold: Number(document.getElementById('burnOffThreshold').value),
    lookahead: Number(document.getElementById('lookahead').value),
    cornerBuffer: Number(document.getElementById('cornerBuffer').value),
    paceBias: Number(document.getElementById('paceBias').value),
    driveEfficiency: Number(document.getElementById('driveEfficiency').value)
  };
}

function tileTrack(track, targetDistance) {
  const baseLength = track.length_m;
  const repeatCount = Math.ceil(targetDistance / baseLength);
  const out = {
    name: track.name,
    description: track.description,
    distance_m: [],
    elevation_m: [],
    grade: [],
    curvature_1pm: [],
    latitude: [],
    longitude: []
  };

  for (let r = 0; r < repeatCount; r++) {
    for (let i = 0; i < track.distance_m.length; i++) {
      if (r > 0 && i === 0) continue;
      const s = track.distance_m[i] + r * baseLength;
      if (s > targetDistance) break;
      out.distance_m.push(s);
      out.elevation_m.push(track.elevation_m[i]);
      out.grade.push(track.grade[i]);
      out.curvature_1pm.push(track.curvature_1pm[i]);
      out.latitude.push(track.latitude[i]);
      out.longitude.push(track.longitude[i]);
    }
  }

  out.length_m = out.distance_m[out.distance_m.length - 1];
  return out;
}

function simulateBurnAndCoast(track, p) {
  const n = track.distance_m.length;
  const s = track.distance_m;
  const ds = new Array(n).fill(0).map((_, i) => i === 0 ? (s[1] - s[0]) : (s[i] - s[i - 1]));
  const vMaxCorner = track.curvature_1pm.map(k => Math.min(p.speedCap, k > 1e-6 ? Math.sqrt(p.latAccel / k) : p.speedCap));

  const v = new Array(n).fill(0);
  const time = new Array(n).fill(0);
  const powerElec = new Array(n).fill(0);
  const powerMech = new Array(n).fill(0);
  const energy = new Array(n).fill(0);
  const mode = new Array(n).fill('coast');
  const accel = new Array(n).fill(0);
  const vTargetEvent = Math.max(0.1, p.eventDistance / p.timeLimit) * p.paceBias;

  let burning = true;
  for (let i = 0; i < n - 1; i++) {
    const vCurr = v[i];
    const dsi = Math.max(ds[i + 1], 1e-3);
    const grade = track.grade[i];
    const theta = Math.atan(grade);
    const fAero = 0.5 * rhoAir * p.cda * vCurr * vCurr;
    const fRoll = p.mass * g * p.crr * Math.cos(theta);
    const fGrade = p.mass * g * Math.sin(theta);
    const fRes = fAero + fRoll + fGrade;

    const lookIdx = Math.min(n - 1, i + Math.max(1, Math.round(p.lookahead / dsi)));
    const futureCornerLimit = Math.min(...vMaxCorner.slice(i, lookIdx + 1));
    const shouldPrepareForCorner = vCurr > futureCornerLimit + p.cornerBuffer;

    if (shouldPrepareForCorner) {
      burning = false;
    } else if (vCurr < Math.min(p.burnOnThreshold, vTargetEvent + 0.2)) {
      burning = true;
    } else if (vCurr > Math.max(p.burnOffThreshold, vTargetEvent + 0.8)) {
      burning = false;
    }

    const availablePower = burning ? Math.min(p.fcPeak, Math.max(p.fcPreferred, p.motorPower)) : 0;
    const driveForcePower = vCurr > 0.5 ? availablePower / vCurr : 190.0;
    const driveForce = burning ? Math.min(190.0, driveForcePower) : 0.0;
    let a = (driveForce - fRes) / p.mass;
    a = Math.max(-0.9, Math.min(0.45, a));

    const vNextRaw = Math.sqrt(Math.max(0, vCurr * vCurr + 2 * a * dsi));
    const vNext = Math.min(vNextRaw, vMaxCorner[i + 1], p.speedCap);
    if (vNext < vCurr && burning && shouldPrepareForCorner) {
      mode[i] = 'pre-corner coast';
    } else {
      mode[i] = burning ? 'burn' : 'coast';
    }

    const avgV = Math.max(0.15, 0.5 * (vCurr + vNext));
    const dt = dsi / avgV;
    const mech = Math.max(0, driveForce * vCurr);
    const elec = mech > 0 ? mech / Math.max(0.01, p.driveEfficiency) : 0.0;

    v[i + 1] = vNext;
    time[i + 1] = time[i] + dt;
    powerMech[i] = mech;
    powerElec[i] = elec;
    energy[i + 1] = energy[i] + elec * dt;
    accel[i] = a;
  }

  const hydrogenKg = energy[n - 1] / (0.52 * 120e6);
  const avgSpeed = track.length_m / time[n - 1];
  const finishMargin = p.timeLimit - time[n - 1];

  const segments = summarizeSegments(track, v, powerElec, mode);

  return {
    vMaxCorner,
    v,
    time,
    powerElec,
    powerMech,
    energy,
    accel,
    mode,
    segments,
    finalTime: time[n - 1],
    finalEnergyWh: energy[n - 1] / 3600,
    avgSpeedKph: avgSpeed * 3.6,
    hydrogenKg,
    finishMargin
  };
}

function summarizeSegments(track, v, power, mode) {
  const out = [];
  const n = track.distance_m.length;
  let start = 0;
  for (let i = 1; i < n; i++) {
    if (mode[i] !== mode[i - 1] || i === n - 1) {
      out.push(sliceStats(track, v, power, start, i, mode[i - 1] || mode[i]));
      start = i;
    }
  }
  return out;
}

function sliceStats(track, v, power, start, end, label) {
  const subset = (arr) => arr.slice(start, end + 1);
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  return {
    segment: `${start + 1}`,
    start_m: track.distance_m[start],
    end_m: track.distance_m[end],
    mode: label,
    mean_speed_kph: mean(subset(v)) * 3.6,
    mean_power_w: mean(subset(power)),
    mean_grade_pct: mean(subset(track.grade)) * 100,
    mean_curvature: mean(subset(track.curvature_1pm))
  };
}

function renderAll(run) {
  updateBoundaryControls(run.baseTrack);
  renderKPIs(run);
  renderPlots(run);
  renderTable(run.result.segments);
}

function renderKPIs(run) {
  const r = run.result;
  const sourceLabel = trackSelect.value === uploadedOptionValue ? 'Uploaded CSV' : 'Bundled track';
  const boundaryLabel = run.boundarySelection.startIndex === run.boundarySelection.finishIndex
    ? `Full loop from ${run.baseTrack.distance_m[run.boundarySelection.startIndex].toFixed(0)} m`
    : `${run.baseTrack.distance_m[run.boundarySelection.startIndex].toFixed(0)} m to ${run.baseTrack.distance_m[run.boundarySelection.finishIndex].toFixed(0)} m`;
  const kpis = [
    ['Run time', `${r.finalTime.toFixed(1)} s`],
    ['Fuel-cell energy', `${r.finalEnergyWh.toFixed(2)} Wh`],
    ['Average speed', `${r.avgSpeedKph.toFixed(2)} km/h`],
    ['Hydrogen estimate', `${(r.hydrogenKg * 1000).toFixed(2)} g`],
    ['Time margin', `${r.finishMargin.toFixed(1)} s`],
    ['Track', run.lapTrack.name],
    ['Source', sourceLabel],
    ['Boundary', boundaryLabel]
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(([label, value]) => `
    <div class="kpi"><div class="label">${label}</div><div class="value">${value}</div></div>
  `).join('');
}

function renderPlots(run) {
  const s = run.simTrack.distance_m;
  const elev = run.simTrack.elevation_m;
  const grade = run.simTrack.grade.map(x => x * 100);
  const curv = run.simTrack.curvature_1pm;
  const vKph = run.result.v.map(x => x * 3.6);
  const vMps = run.result.v;
  const vCorner = run.result.vMaxCorner.map(x => x * 3.6);
  const power = run.result.powerElec;
  const energy = run.result.energy.map(x => x / 3600);
  const time = run.result.time;
  const mapTrack = run.lapTrack;
  const mapSpeedMps = sampleLapValues(run.result.v, run.simTrack.distance_m, run.lapTrack.distance_m);
  const mapSpeedKph = mapSpeedMps.map(value => value * 3.6);
  const baseStart = run.boundarySelection.startIndex;
  const baseFinish = run.boundarySelection.finishIndex;
  const fullLoop = baseStart === baseFinish;

  Plotly.newPlot('mapPlot', [
    {
      x: run.baseTrack.longitude,
      y: run.baseTrack.latitude,
      mode: 'lines',
      type: 'scatter',
      line: { width: 3, color: 'rgba(235, 241, 255, 0.35)' },
      name: 'Full track'
    },
    {
      x: mapTrack.longitude,
      y: mapTrack.latitude,
      mode: 'lines',
      type: 'scatter',
      line: { width: 5, color: '#6ea8ff' },
      name: fullLoop ? 'Active loop' : 'Active segment'
    },
    {
      x: run.baseTrack.longitude,
      y: run.baseTrack.latitude,
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: 9,
        color: 'rgba(0,0,0,0)',
        line: { width: 0 }
      },
      hovertemplate: 'Distance %{customdata:.1f} m<extra></extra>',
      customdata: run.baseTrack.distance_m,
      name: 'Selectable points',
      showlegend: false
    },
    {
      x: [run.baseTrack.longitude[baseStart]],
      y: [run.baseTrack.latitude[baseStart]],
      mode: 'markers',
      type: 'scatter',
      marker: { size: 12, color: '#63e6be' },
      name: 'Start'
    },
    {
      x: [run.baseTrack.longitude[baseFinish]],
      y: [run.baseTrack.latitude[baseFinish]],
      mode: 'markers',
      type: 'scatter',
      marker: { size: 12, color: '#ff8787' },
      name: 'Finish'
    }
  ], buildMapLayout('Track map'), { responsive: true });
  attachMapClickHandler(run.baseTrack);

  Plotly.newPlot('speedMapKphPlot', [
    buildSpeedMapTrace(mapTrack, mapSpeedKph, 'km/h')
  ], buildMapLayout('Speed gradient on track (km/h)'), { responsive: true });

  Plotly.newPlot('speedMapMpsPlot', [
    buildSpeedMapTrace(mapTrack, mapSpeedMps, 'm/s')
  ], buildMapLayout('Speed gradient on track (m/s)'), { responsive: true });

  Plotly.newPlot('speedPlot', [
    { x: s, y: vCorner, type: 'scatter', mode: 'lines', name: 'Corner limit' },
    { x: s, y: vKph, type: 'scatter', mode: 'lines', name: 'Actual speed' }
  ], {
    title: 'Speed profile',
    xaxis: { title: 'Distance (m)' },
    yaxis: { title: 'Speed (km/h)' },
    ...sharedPlotLayout()
  }, { responsive: true });

  Plotly.newPlot('powerPlot', [
    { x: s, y: power, type: 'scatter', mode: 'lines', name: 'Fuel-cell electrical power' }
  ], {
    title: 'Fuel-cell electrical power demand',
    xaxis: { title: 'Distance (m)' },
    yaxis: { title: 'Power (W)' },
    shapes: [
      { type: 'line', x0: s[0], x1: s[s.length - 1], y0: run.params.fcPreferred, y1: run.params.fcPreferred, line: { dash: 'dot' } },
      { type: 'line', x0: s[0], x1: s[s.length - 1], y0: run.params.fcPeak, y1: run.params.fcPeak, line: { dash: 'dash' } }
    ],
    ...sharedPlotLayout()
  }, { responsive: true });

  Plotly.newPlot('energyPlot', [
    { x: s, y: time, type: 'scatter', mode: 'lines', name: 'Elapsed time (s)', yaxis: 'y1' },
    { x: s, y: energy, type: 'scatter', mode: 'lines', name: 'Cumulative fuel-cell energy (Wh)', yaxis: 'y2' }
  ], {
    title: 'Time and cumulative energy',
    xaxis: { title: 'Distance (m)' },
    yaxis: { title: 'Time (s)' },
    yaxis2: { title: 'Fuel-cell energy (Wh)', overlaying: 'y', side: 'right' },
    ...sharedPlotLayout()
  }, { responsive: true });

  Plotly.newPlot('trackPlot', [
    { x: s, y: elev, type: 'scatter', mode: 'lines', name: 'Elevation (m)', yaxis: 'y1' },
    { x: s, y: grade, type: 'scatter', mode: 'lines', name: 'Grade (%)', yaxis: 'y2' },
    { x: s, y: curv, type: 'scatter', mode: 'lines', name: 'Curvature (1/m)', yaxis: 'y3' }
  ], {
    title: 'Track geometry and derived quantities',
    xaxis: { title: 'Distance (m)' },
    yaxis: { title: 'Elevation (m)' },
    yaxis2: { title: 'Grade (%)', overlaying: 'y', side: 'right' },
    yaxis3: { title: 'Curvature (1/m)', anchor: 'free', overlaying: 'y', side: 'right', position: 0.94 },
    ...sharedPlotLayout()
  }, { responsive: true });
}

function buildSpeedMapTrace(track, values, unitLabel) {
  return {
    x: track.longitude,
    y: track.latitude,
    mode: 'markers',
    type: 'scatter',
    marker: {
      size: 7,
      color: values,
      colorscale: 'Turbo',
      colorbar: { title: unitLabel },
      line: { width: 0 }
    },
    text: values.map(value => `${value.toFixed(2)} ${unitLabel}`),
    hovertemplate: 'Lon %{x:.6f}<br>Lat %{y:.6f}<br>Speed %{text}<extra></extra>',
    name: `Speed (${unitLabel})`
  };
}

function buildMapLayout(title) {
  return {
    title,
    xaxis: { title: 'Longitude' },
    yaxis: { title: 'Latitude', scaleanchor: 'x', scaleratio: 1 },
    showlegend: true,
    ...sharedPlotLayout()
  };
}

function attachMapClickHandler(baseTrack) {
  const mapDiv = document.getElementById('mapPlot');
  if (!mapDiv?.on) {
    return;
  }

  mapDiv.removeAllListeners?.('plotly_click');
  mapDiv.on('plotly_click', (event) => {
    if (!boundarySelection.pendingSelection) {
      return;
    }

    const clickedPoint = event.points?.find(point => point?.curveNumber === 2 || point?.pointNumber != null);
    const clickedIndex = clickedPoint?.pointNumber;
    if (!Number.isInteger(clickedIndex)) {
      return;
    }

    const wasFullLoop = boundarySelection.startIndex === boundarySelection.finishIndex;
    if (boundarySelection.pendingSelection === 'loop') {
      boundarySelection.startIndex = clickedIndex;
      boundarySelection.finishIndex = clickedIndex;
    } else if (boundarySelection.pendingSelection === 'start') {
      boundarySelection.startIndex = clickedIndex;
      if (wasFullLoop) {
        boundarySelection.finishIndex = clickedIndex;
      }
    } else if (boundarySelection.pendingSelection === 'finish') {
      boundarySelection.finishIndex = clickedIndex;
    }

    boundarySelection.pendingSelection = null;
    updateBoundaryControls(baseTrack);
    runScenario();
  });
}

function sharedPlotLayout() {
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#ebf1ff' },
    margin: { l: 60, r: 30, t: 60, b: 50 }
  };
}

function renderTable(rows) {
  const tbody = document.querySelector('#segmentTable tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.segment}</td>
      <td>${r.start_m.toFixed(1)}</td>
      <td>${r.end_m.toFixed(1)}</td>
      <td>${r.mode}</td>
      <td>${r.mean_speed_kph.toFixed(2)}</td>
      <td>${r.mean_power_w.toFixed(1)}</td>
      <td>${r.mean_grade_pct.toFixed(2)}</td>
      <td>${r.mean_curvature.toFixed(4)}</td>
    </tr>
  `).join('');
}

function downloadResults() {
  if (!lastRun) return;
  const blob = new Blob([JSON.stringify(lastRun, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'race_strategy_results.json';
  a.click();
}

function sampleLapValues(values, simDistance, lapDistance) {
  return lapDistance.map(targetDistance => {
    let bestIndex = 0;
    while (bestIndex < simDistance.length - 1 && simDistance[bestIndex + 1] <= targetDistance) {
      bestIndex += 1;
    }
    return values[Math.min(bestIndex, values.length - 1)] ?? 0;
  });
}

function buildConfiguredTrack(track, startIndex, finishIndex) {
  const pointCount = track.distance_m.length;
  if (pointCount < 3) {
    throw new Error('Track needs at least 3 points to define a route.');
  }

  const normalizedStart = clampTrackIndex(startIndex, pointCount);
  const normalizedFinish = clampTrackIndex(finishIndex, pointCount);
  const orderedIndices = [];

  if (normalizedStart === normalizedFinish) {
    for (let i = normalizedStart; i < pointCount; i++) {
      orderedIndices.push(i);
    }
    for (let i = 0; i <= normalizedStart; i++) {
      orderedIndices.push(i);
    }
  } else if (normalizedStart < normalizedFinish) {
    for (let i = normalizedStart; i <= normalizedFinish; i++) {
      orderedIndices.push(i);
    }
  } else {
    for (let i = normalizedStart; i < pointCount; i++) {
      orderedIndices.push(i);
    }
    for (let i = 0; i <= normalizedFinish; i++) {
      orderedIndices.push(i);
    }
  }

  return buildTrackFromSamples({
    name: track.name,
    description: track.description,
    latitude: orderedIndices.map(index => track.latitude[index]),
    longitude: orderedIndices.map(index => track.longitude[index]),
    elevation_m: orderedIndices.map(index => track.elevation_m[index] ?? 0)
  });
}

function clampTrackIndex(index, pointCount) {
  return Math.max(0, Math.min(pointCount - 1, Number(index) || 0));
}

function buildTrackFromSamples(track) {
  const lat = track.latitude.map(Number);
  const lon = track.longitude.map(Number);
  const alt = track.elevation_m.map(Number);
  if (lat.length < 3) {
    throw new Error('Selected start/finish segment is too short. Pick points farther apart.');
  }

  const earthRadius = 6371000.0;
  const latRadians = lat.map(value => value * Math.PI / 180);
  const lonRadians = lon.map(value => value * Math.PI / 180);
  const distance = [0];

  for (let i = 1; i < lat.length; i++) {
    const dLat = latRadians[i] - latRadians[i - 1];
    const dLon = lonRadians[i] - lonRadians[i - 1];
    const dy = earthRadius * dLat;
    const dx = earthRadius * Math.cos(latRadians[i]) * dLon;
    distance.push(distance[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }

  const stepDistance = [];
  for (let i = 0; i < distance.length; i++) {
    stepDistance.push(i === 0 ? 0 : distance[i] - distance[i - 1]);
  }

  const gradeRaw = alt.map((value, index) => {
    if (index === 0) {
      return 0;
    }
    return (value - alt[index - 1]) / Math.max(stepDistance[index], 1e-3);
  });
  const grade = smoothSeries(gradeRaw, 7);

  const headings = [0];
  for (let i = 1; i < lat.length; i++) {
    const dLat = latRadians[i] - latRadians[i - 1];
    const dLon = lonRadians[i] - lonRadians[i - 1];
    const dy = earthRadius * dLat;
    const dx = earthRadius * Math.cos(latRadians[i]) * dLon;
    const rawHeading = Math.atan2(dy, dx);
    let delta = rawHeading - headings[i - 1];
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    headings.push(headings[i - 1] + delta);
  }

  const curvatureRaw = headings.map((heading, index) => {
    if (index === 0) {
      return 0;
    }
    return Math.abs((heading - headings[index - 1]) / Math.max(stepDistance[index], 1e-3));
  });

  return {
    name: track.name,
    description: track.description,
    length_m: distance[distance.length - 1],
    distance_m: distance,
    elevation_m: alt,
    grade: grade,
    curvature_1pm: smoothSeries(curvatureRaw, 9),
    latitude: lat,
    longitude: lon
  };
}

function buildTrackFromCsvText(text, trackName, dsGrid = 2.0) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    throw new Error('CSV does not contain enough rows.');
  }

  const headers = rows[0].map(header => String(header).trim());
  const dataRows = rows.slice(1).filter(row => row.some(cell => String(cell).trim() !== ''));
  const latIndex = findHeaderIndex(headers, ['Latitude', 'Lat']);
  const lonIndex = findHeaderIndex(headers, ['Longitude', 'Lon', 'Lng', 'Long']);
  const altIndex = findHeaderIndex(headers, ['Metres above sea level', 'Meters above sea level', 'Elevation', 'Altitude', 'Alt'], false);

  const lat = [];
  const lon = [];
  const alt = [];

  dataRows.forEach(row => {
    const latValue = Number(row[latIndex]);
    const lonValue = Number(row[lonIndex]);
    const altValue = altIndex === -1 ? 0 : Number(row[altIndex]);

    if (Number.isFinite(latValue) && Number.isFinite(lonValue)) {
      lat.push(latValue);
      lon.push(lonValue);
      alt.push(Number.isFinite(altValue) ? altValue : 0);
    }
  });

  if (lat.length < 3) {
    throw new Error('CSV must include at least 3 valid latitude/longitude points.');
  }

  const earthRadius = 6371000.0;
  const latRadians = lat.map(value => value * Math.PI / 180);
  const lonRadians = lon.map(value => value * Math.PI / 180);

  const sRaw = [0];
  for (let i = 1; i < lat.length; i++) {
    const dLat = latRadians[i] - latRadians[i - 1];
    const dLon = lonRadians[i] - lonRadians[i - 1];
    const dy = earthRadius * dLat;
    const dx = earthRadius * Math.cos(latRadians[i]) * dLon;
    sRaw.push(sRaw[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }

  const s = [];
  for (let distance = 0; distance <= sRaw[sRaw.length - 1] + dsGrid; distance += dsGrid) {
    s.push(distance);
  }

  const latGrid = interpolateSeries(sRaw, lat, s);
  const lonGrid = interpolateSeries(sRaw, lon, s);
  const altGrid = interpolateSeries(sRaw, alt, s);

  const dAlt = altGrid.map((value, i) => i === 0 ? 0 : value - altGrid[i - 1]);
  const grade = smoothSeries(dAlt.map(value => value / dsGrid), Math.max(3, Math.round(12 / dsGrid)));

  const latGridRad = latGrid.map(value => value * Math.PI / 180);
  const lonGridRad = lonGrid.map(value => value * Math.PI / 180);
  const headings = [];
  let unwrappedHeading = 0;
  for (let i = 0; i < latGrid.length; i++) {
    if (i === 0) {
      headings.push(0);
      continue;
    }
    const dLat = latGridRad[i] - latGridRad[i - 1];
    const dLon = lonGridRad[i] - lonGridRad[i - 1];
    const dy = earthRadius * dLat;
    const dx = earthRadius * Math.cos(latGridRad[i]) * dLon;
    const rawHeading = Math.atan2(dy, dx);
    let delta = rawHeading - headings[i - 1];
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    unwrappedHeading = headings[i - 1] + delta;
    headings.push(unwrappedHeading);
  }

  const curvatureRaw = headings.map((heading, i) => i === 0 ? 0 : Math.abs((heading - headings[i - 1]) / Math.max(dsGrid, 1e-3)));
  const curvature = smoothSeries(curvatureRaw, Math.max(5, Math.round(20 / dsGrid)));

  return {
    name: trackName,
    description: 'Track exported from uploaded CSV data.',
    length_m: s[s.length - 1],
    distance_m: s,
    elevation_m: altGrid,
    grade,
    curvature_1pm: curvature,
    latitude: latGrid,
    longitude: lonGrid
  };
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(value.trim());
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.trim());
    rows.push(row);
  }

  return rows.filter(currentRow => currentRow.some(cell => cell !== ''));
}

function findHeaderIndex(headers, candidates, required = true) {
  const normalizedHeaders = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalizedHeaders.indexOf(normalizeHeader(candidate));
    if (index !== -1) {
      return index;
    }
  }
  if (required) {
    throw new Error(`Missing required column. Expected one of: ${candidates.join(', ')}`);
  }
  return -1;
}

function normalizeHeader(header) {
  return String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveAssetUrl(relativePath) {
  const normalizedPath = String(relativePath).replace(/^\.\//, '');
  const url = new URL(normalizedPath, docsBaseUrl);
  url.searchParams.set('v', appVersion);
  return url.toString();
}

function interpolateSeries(xSource, ySource, xTarget) {
  const result = [];
  let sourceIndex = 0;

  xTarget.forEach(target => {
    while (sourceIndex < xSource.length - 2 && xSource[sourceIndex + 1] < target) {
      sourceIndex += 1;
    }

    const x0 = xSource[sourceIndex];
    const x1 = xSource[Math.min(sourceIndex + 1, xSource.length - 1)];
    const y0 = ySource[sourceIndex];
    const y1 = ySource[Math.min(sourceIndex + 1, ySource.length - 1)];

    if (x1 === x0) {
      result.push(y0);
      return;
    }

    const ratio = (target - x0) / (x1 - x0);
    result.push(y0 + ratio * (y1 - y0));
  });

  return result;
}

function smoothSeries(values, window) {
  let width = Math.max(1, Math.round(window));
  if (width === 1) {
    return values.slice();
  }
  if (width % 2 === 0) {
    width += 1;
  }
  const radius = Math.floor(width / 2);
  return values.map((_, index) => {
    let total = 0;
    let count = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const sample = values[index + offset];
      if (Number.isFinite(sample)) {
        total += sample;
        count += 1;
      }
    }
    return count > 0 ? total / count : values[index];
  });
}

function tracksEquivalent(a, b) {
  if (!a || !b) {
    return false;
  }
  return approxEqual(a.length_m, b.length_m, 0.25)
    && a.distance_m.length === b.distance_m.length
    && approxEqual(a.latitude[0], b.latitude[0], 1e-6)
    && approxEqual(a.longitude[0], b.longitude[0], 1e-6)
    && approxEqual(a.latitude[a.latitude.length - 1], b.latitude[b.latitude.length - 1], 1e-6)
    && approxEqual(a.longitude[a.longitude.length - 1], b.longitude[b.longitude.length - 1], 1e-6);
}

function approxEqual(left, right, tolerance) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}
