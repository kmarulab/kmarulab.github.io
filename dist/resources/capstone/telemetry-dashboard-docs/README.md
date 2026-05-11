# Indy 500 Fuel Cell Telemetry Dashboard

A real-time telemetry ingestion and visualization dashboard designed to parse RS232 hex packets from a hydrogen fuel cell and broadcast them live over WebSockets. Integrated with session logging and secure public tunneling.

## 1. Prerequisites & Installation

Before running the application, ensure all dependencies are installed. You will need Python 3 installed on your Raspberry Pi (or whatever machine you are using as the host).

1. Open your terminal and navigate to the `Indy500Dashboard` directory:
   ```bash
   cd /path/to/telemetryy/Indy500Dashboard
   ```
2. Install the required Python packages:
   ```bash
   pip3 install -r requirements.txt
   ```
*(Note: This installs Flask, Flask-SocketIO, Pandas, PySerial, and PyNgrok).*

---

## 2. Connecting the Hardware (RS232)

1. Connect your RS232-to-USB adapter cable from the hydrogen fuel cell board into one of the USB ports on your Raspberry Pi (or computer).
2. **Identify the Serial Port:**
   - On **Linux / Raspberry Pi**, the port usually shows up as `/dev/ttyUSB0` or `/dev/ttyACM0`. You can verify by running:
     ```bash
     ls /dev/ttyUSB*
     ```
   - On **macOS**, it will look something like `/dev/tty.usbserial-A9OAID1K`. You can verify by running:
     ```bash
     ls /dev/tty.*
     ```
   - On **Windows**, it will be a COM port (e.g., `COM3`). You can check Device Manager.

---

## 3. Starting the Dashboard Server

The main server hosts the frontend dashboard UI and the Socket.IO broadcasting endpoint. It also handles automatic logging of all telemetry data into the `logged-run/` folder.

**To start the server locally (accessible on your current Wi-Fi network):**
```bash
python3 app.py
```
*You can now access the dashboard from any device on the same Wi-Fi by going to `http://<YOUR-PI-IP-ADDRESS>:5050`.*

**To start the server and make it accessible globally over the internet:**
```bash
python3 app.py --public
```
*This will output an `ngrok` URL (e.g., `https://<random-id>.ngrok-free.app`) in the terminal. You can access this URL from anywhere in the world.*

---

## 4. Streaming Live Telemetry Data

In a separate terminal window, you need to run the `push_telemetry.py` script. This script reads the raw data from the USB serial port, decodes the hex packets into temperatures, currents, and voltages, and pushes it to the dashboard.

**To run with Live Hardware Data:**
```bash
python3 push_telemetry.py --serial /dev/ttyUSB0 --baudrate 9600
```
*(Replace `/dev/ttyUSB0` with the actual port you found in Step 2).*

**To run in Simulation Mode (Offline testing without the car):**
If you do not specify a `--serial` port, or if the hardware connection completely fails, the script will automatically fall back to using your offline text logs to simulate a real telemetry stream:
```bash
python3 push_telemetry.py
```

---

## 5. Adding Additional Sensors

Inside `push_telemetry.py`, there are placeholder functions purposefully carved out for expanding the system:
- `read_gps_sensor()`
- `read_imu_sensor()`
- `read_weather_sensor()`

When you wire up these modules (e.g., via I2C on the Raspberry Pi), you simply drop your readout logic into these functions. The main loop will automatically harvest their data and push it inside the unified JSON payload over to the dashboard.

---

## 6. Data Logging & Extraction

Every time you start a stream, the `app.py` server creates an entirely raw string JSON sequence log.
- These logs are structured sequentially as `.jsonl` files (JSON Lines).
- They are stored inside the `Indy500Dashboard/logged-run/` folder.
- File names contain the timestamp of the very first packet of the session (e.g. `run_20260316_161427.jsonl`).

Because these are raw JSON lines with timestamps, they can be natively ingested by generic data analysis pipelines (`pandas.read_json(..., lines=True)`) without needing complicated parsers.
