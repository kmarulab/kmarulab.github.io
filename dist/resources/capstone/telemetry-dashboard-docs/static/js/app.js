document.addEventListener("DOMContentLoaded", () => {
    // Connect to websocket
    const socket = io();

    // Elements
    const elVoltage = document.getElementById('val-voltage');
    const elCurrent = document.getElementById('val-current');
    const elPower = document.getElementById('val-power');
    const elTemp = document.getElementById('val-temp');
    const elFlow = document.getElementById('val-flow');
    const barFlow = document.getElementById('flow-bar');
    const cardTemp = document.getElementById('card-temp');
    
    const elSpeed = document.getElementById('val-speed');
    const elAccel = document.getElementById('val-accel');
    const elGdot = document.getElementById('g-dot');
    
    const elPitch = document.getElementById('val-pitch');
    const elRoll = document.getElementById('val-roll');
    const elYaw = document.getElementById('val-yaw');
    
    const elRhFl = document.getElementById('val-rh-fl');
    const elRhFr = document.getElementById('val-rh-fr');
    const elRhRl = document.getElementById('val-rh-rl');
    const elRhRr = document.getElementById('val-rh-rr');
    
    const elSteering = document.getElementById('val-steering');
    const wheelSteering = document.getElementById('steering-wheel');
    const barThrottle = document.getElementById('bar-throttle');
    const barBrake = document.getElementById('bar-brake');
    
    const elAirTemp = document.getElementById('val-air-temp');
    const elTrackTemp = document.getElementById('val-track-temp');
    const elHumidity = document.getElementById('val-humidity');

    // Chart.js Setup
    const ctxH2Chart = document.getElementById('h2Chart').getContext('2d');
    const h2Chart = new Chart(ctxH2Chart, {
        type: 'line',
        data: {
            labels: [], // Time segments
            datasets: [
                { label: 'Amb Temp(C)', data: [], borderColor: '#4caf50', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                { label: 'Stack Temp(C)', data: [], borderColor: '#ff9800', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                { label: 'Stack V(V)', data: [], borderColor: '#00e5ff', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                { label: 'Stack I(A)', data: [], borderColor: '#ff3366', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                { label: 'Stack P(W)', data: [], borderColor: '#9c27b0', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                { label: 'Bat V(V)', data: [], borderColor: '#ffff00', borderWidth: 2, pointRadius: 0, tension: 0.1 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { labels: { color: '#88a4c3', font: { size: 10, family: 'Orbitron' } } }
            },
            scales: {
                x: { display: false },
                y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#88a4c3' } }
            }
        }
    });
    
    const MAX_CHART_POINTS = 50;
    
    function updateChart(data) {
        if (h2Chart.data.labels.length > MAX_CHART_POINTS) {
            h2Chart.data.labels.shift();
            h2Chart.data.datasets.forEach(ds => ds.data.shift());
        }
        
        const now = new Date();
        h2Chart.data.labels.push(now.toLocaleTimeString());
        
        // Push payload data into matching datasets
        h2Chart.data.datasets[0].data.push(data.weather.air_temp_c);
        h2Chart.data.datasets[1].data.push(data.h2_status.core_temp_c);
        h2Chart.data.datasets[2].data.push(data.h2_status.voltage);
        h2Chart.data.datasets[3].data.push(data.h2_status.current);
        h2Chart.data.datasets[4].data.push(data.h2_status.power_kw * 1000); // Back to W internally if needed, or power_kw is actually small in the simulator
        h2Chart.data.datasets[5].data.push(data.h2_status.bat_v || 12.0); // bat_v may be missing from random simulator, provide default
        
        h2Chart.update();
    }

    // Chart controls
    const metricSelect = document.getElementById('chart-metric-select');
    if (metricSelect) {
        metricSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            h2Chart.data.datasets.forEach((ds, idx) => {
                if (val === 'all') {
                    ds.hidden = false;
                } else {
                    ds.hidden = (idx !== parseInt(val));
                }
            });
            h2Chart.update();
        });
    }

    // Canvas setup
    const canvas = document.getElementById('trackCanvas');
    const ctx = canvas.getContext('2d');
    let trackCoords = [];
    let trackBounds = { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
    let currentPos = { lat: 0, lng: 0 };

    function resizeCanvas() {
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        drawTrack();
    }
    window.addEventListener('resize', resizeCanvas);

    // Fetch track coordinates
    fetch('/api/track_coords')
        .then(res => res.json())
        .then(data => {
            if (data.coords && data.coords.length > 0) {
                trackCoords = data.coords;
                computeBounds();
                resizeCanvas();
            }
        });

    function computeBounds() {
        if (trackCoords.length === 0) return;
        trackBounds.minLat = Math.min(...trackCoords.map(c => c.lat));
        trackBounds.maxLat = Math.max(...trackCoords.map(c => c.lat));
        trackBounds.minLng = Math.min(...trackCoords.map(c => c.lng));
        trackBounds.maxLng = Math.max(...trackCoords.map(c => c.lng));
    }

    function projectScale(lat, lng) {
        if (!trackBounds.maxLat || trackCoords.length === 0) return {x: canvas.width/2, y: canvas.height/2};
        
        const padding = 20;
        const w = canvas.width - padding * 2;
        const h = canvas.height - padding * 2;
        
        const latRange = trackBounds.maxLat - trackBounds.minLat || 1;
        const lngRange = trackBounds.maxLng - trackBounds.minLng || 1;
        
        // Preserve aspect ratio
        const scaleDist = Math.max(latRange, lngRange);
        const scaleX = w / scaleDist;
        const scaleY = h / scaleDist;
        const scale = Math.min(scaleX, scaleY);
        
        // Offset to center
        const cx = w/2 - (lngRange * scale)/2;
        const cy = h/2 - (latRange * scale)/2;
        
        const x = padding + cx + (lng - trackBounds.minLng) * scale;
        // Invert Y because lat increases northwards, but canvas Y increases downwards
        const y = padding + cy + (trackBounds.maxLat - lat) * scale;
        
        return {x, y};
    }

    function drawTrack() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (trackCoords.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 4;
            
            const start = projectScale(trackCoords[0].lat, trackCoords[0].lng);
            ctx.moveTo(start.x, start.y);
            
            for (let i = 1; i < trackCoords.length; i++) {
                const pt = projectScale(trackCoords[i].lat, trackCoords[i].lng);
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Draw car
        if (currentPos.lat !== 0 && currentPos.lng !== 0 && trackCoords.length > 0) {
            const pt = projectScale(currentPos.lat, currentPos.lng);
            ctx.beginPath();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00e5ff';
            ctx.fillStyle = '#00e5ff';
            ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Pulse ring
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.arc(pt.x, pt.y, 15 + Math.random()*5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        requestAnimationFrame(drawTrack); // Keep animating glow
    }

    resizeCanvas(); // Initial call

    // Socket data handler
    socket.on('telemetry_update', (data) => {
        // Hydrogen System
        elVoltage.innerText = data.h2_status.voltage.toFixed(1);
        elCurrent.innerText = data.h2_status.current.toFixed(1);
        elPower.innerText = data.h2_status.power_kw.toFixed(1);
        elTemp.innerText = data.h2_status.core_temp_c.toFixed(1);
        if (data.h2_status.core_temp_c > 80) {
            cardTemp.classList.add('warning');
        } else {
            cardTemp.classList.remove('warning');
        }
        
        elFlow.innerText = data.h2_status.flowmeter_kgh.toFixed(2);
        // Map flow from 0 to 5 for UI scale
        const flowPct = Math.min(100, Math.max(0, (data.h2_status.flowmeter_kgh / 3.0) * 100));
        barFlow.style.width = `${flowPct}%`;

        // Dynamics
        elSpeed.innerText = Math.round(data.dynamics.speed_kmh);
        elAccel.innerText = data.dynamics.accel_g.toFixed(2);
        
        // Update Chart
        updateChart(data);

        // Move G dot 
        // accel_g maps from -4 to 4 G roughly for circle bounds. 
        // This is a simple 1D mapping to X for simulation purposes if we only have linear accel,
        // but let's fake lateral accel using steering for visual effect.
        const latG = (data.driver.steering_angle / 90) * (data.dynamics.speed_kmh / 200); 
        const maxRadius = 30; // 40px radius of widget
        const gX = Math.min(maxRadius, Math.max(-maxRadius, latG * 10)); // Scale factor
        const gY = Math.min(maxRadius, Math.max(-maxRadius, -data.dynamics.accel_g * 10)); 
        elGdot.style.transform = `translate(${gX}px, ${gY}px)`;

        // MPU
        elPitch.innerText = data.mpu.pitch.toFixed(1) + '°';
        elRoll.innerText = data.mpu.roll.toFixed(1) + '°';
        elYaw.innerText = data.mpu.yaw.toFixed(1) + '°';
        
        elRhFl.innerText = data.mpu.ride_height.fl.toFixed(1);
        elRhFr.innerText = data.mpu.ride_height.fr.toFixed(1);
        elRhRl.innerText = data.mpu.ride_height.rl.toFixed(1);
        elRhRr.innerText = data.mpu.ride_height.rr.toFixed(1);

        // Driver
        const steer = data.driver.steering_angle;
        elSteering.innerText = Math.abs(steer).toFixed(1);
        wheelSteering.style.transform = `rotate(${steer}deg)`;
        
        barThrottle.style.height = `${data.driver.throttle_pc}%`;
        barBrake.style.height = `${data.driver.brake_pc}%`;

        // Weather
        elAirTemp.innerText = data.weather.air_temp_c.toFixed(1) + ' °C';
        elTrackTemp.innerText = data.weather.track_temp_c.toFixed(1) + ' °C';
        elHumidity.innerText = data.weather.humidity_pc.toFixed(1) + ' %';
        
        // GPS
        currentPos.lat = data.gps.lat;
        currentPos.lng = data.gps.lng;
    });
});
