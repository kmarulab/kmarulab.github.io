document.addEventListener("DOMContentLoaded", () => {
    // Connect to websocket
    const socket = io();

    // Common Chart Options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: { display: false },
            y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#88a4c3' } }
        }
    };

    // Helper to create a chart
    function createChart(ctxId, color) {
        return new Chart(document.getElementById(ctxId).getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: color,
                    backgroundColor: color + '33', // 20% opacity fill
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2,
                    fill: true
                }]
            },
            options: commonOptions
        });
    }

    // Initialize the 6 charts
    const charts = {
        ambTemp: createChart('chart-amb-temp', '#4caf50'),
        stackTemp: createChart('chart-stack-temp', '#ff9800'),
        stackV: createChart('chart-stack-v', '#00e5ff'),
        stackI: createChart('chart-stack-i', '#ff3366'),
        stackP: createChart('chart-stack-p', '#9c27b0'),
        batV: createChart('chart-bat-v', '#ffff00')
    };

    const MAX_CHART_POINTS = 100;

    socket.on('telemetry_update', (data) => {
        const now = new Date().toLocaleTimeString();
        
        // Helper to push data to a specific chart
        function pushData(chart, value) {
            if (chart.data.labels.length > MAX_CHART_POINTS) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(value);
            chart.update();
        }

        pushData(charts.ambTemp, data.weather.air_temp_c);
        pushData(charts.stackTemp, data.h2_status.core_temp_c);
        pushData(charts.stackV, data.h2_status.voltage);
        pushData(charts.stackI, data.h2_status.current);
        pushData(charts.stackP, data.h2_status.power_kw); // Keep as kW here since it's its own chart
        pushData(charts.batV, data.h2_status.bat_v || 12.0);
    });
});
