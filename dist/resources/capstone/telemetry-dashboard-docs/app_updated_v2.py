import json
import os
import threading
import time
from typing import Any, Dict, Optional

import serial
from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO

from race_strategy_runtime_v2 import RaceStrategyEngine, resolve_track_path


app = Flask(__name__)
app.config["SECRET_KEY"] = "sem_telemetry_secret"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRACK_FOLDER = os.path.join(BASE_DIR, "track")
TRACK_PATH = resolve_track_path(TRACK_FOLDER)
SERIAL_PORT = os.environ.get("ARDUINO_SERIAL_PORT", "/dev/cu.usbmodem8301")
SERIAL_BAUDRATE = int(os.environ.get("ARDUINO_BAUDRATE", "115200"))
DEFAULT_LAT = 39.7931
DEFAULT_LNG = -86.2352

strategy_engine = RaceStrategyEngine(track_path=TRACK_PATH)


serial_lock = threading.Lock()
state_lock = threading.Lock()
strategy_lock = threading.Lock()
telemetry_override_lock = threading.Lock()

serial_handle: Optional[serial.Serial] = None
arduino_connected = False
last_notified_mode: Optional[str] = None

arduino_data: Dict[str, Any] = {
    "str": 0.0,
    "gx": 0.0,
    "gy": 0.0,
    "gz": 0.0,
    "last_update_ts": 0.0,
}

latest_external_payload: Optional[Dict[str, Any]] = None
latest_external_payload_ts = 0.0


def open_serial_connection() -> bool:
    """Open the Arduino serial port if it is available."""
    global serial_handle, arduino_connected

    if serial_handle and serial_handle.is_open:
        arduino_connected = True
        return True

    try:
        handle = serial.Serial(
            SERIAL_PORT,
            SERIAL_BAUDRATE,
            timeout=0.1,
            write_timeout=0.25,
        )
        time.sleep(2.0)
        with serial_lock:
            handle.reset_input_buffer()
        serial_handle = handle
        arduino_connected = True
        print(f"Arduino connected on {SERIAL_PORT} @ {SERIAL_BAUDRATE} baud.")
        return True
    except Exception as exc:
        serial_handle = None
        arduino_connected = False
        print(f"Arduino unavailable on {SERIAL_PORT}: {exc}")
        return False


def close_serial_connection() -> None:
    """Close the Arduino serial handle and mark the hardware as offline."""
    global serial_handle, arduino_connected

    arduino_connected = False
    handle = serial_handle
    serial_handle = None

    if not handle:
        return

    try:
        with serial_lock:
            if handle.is_open:
                handle.close()
    except Exception:
        pass


def arduino_reader() -> None:
    """Continuously ingest newline-delimited JSON from the Arduino."""
    global arduino_connected

    while True:
        if not open_serial_connection():
            time.sleep(2.0)
            continue

        try:
            with serial_lock:
                raw_line = serial_handle.readline() if serial_handle else b""

            if not raw_line:
                time.sleep(0.005)
                continue

            line = raw_line.decode("utf-8", errors="ignore").strip()
            if not (line.startswith("{") and line.endswith("}")):
                continue

            new_data = json.loads(line)
            with state_lock:
                arduino_data.update(
                    {
                        "str": float(new_data.get("str", arduino_data["str"])),
                        "gx": float(new_data.get("gx", arduino_data["gx"])),
                        "gy": float(new_data.get("gy", arduino_data["gy"])),
                        "gz": float(new_data.get("gz", arduino_data["gz"])),
                        "last_update_ts": time.time(),
                    }
                )
        except (serial.SerialException, OSError) as exc:
            print(f"Arduino disconnected: {exc}")
            close_serial_connection()
            time.sleep(1.0)
        except (ValueError, json.JSONDecodeError):
            # Ignore malformed frames and keep the stream alive.
            continue


def get_sensor_snapshot() -> Dict[str, Any]:
    with state_lock:
        return dict(arduino_data)


def send_strategy_notification(mode: str) -> None:
    """
    Notify the Arduino only when the strategy mode changes.

    The board already maps:
    - 'B' => two beeps (burning)
    - 'C' => one beep (coasting)
    """
    global last_notified_mode

    with strategy_lock:
        if last_notified_mode is None:
            last_notified_mode = mode
            return

        if mode == last_notified_mode:
            return

        if not arduino_connected or not serial_handle:
            last_notified_mode = mode
            return

        command = b"B" if mode == "burn" else b"C"

        try:
            with serial_lock:
                serial_handle.write(command)
                serial_handle.flush()
            print(f"Strategy changed to {mode}; sent {command.decode('ascii')} to Arduino.")
            last_notified_mode = mode
        except (serial.SerialException, OSError) as exc:
            print(f"Failed to notify Arduino strategy change: {exc}")
            close_serial_connection()


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def synthesize_h2_status(state: Dict[str, Any], sensor_age_s: float) -> Dict[str, float]:
    burn_factor = 1.0 if state["segment_type"] == "burn" else 0.0
    voltage = 46.0
    current = 5.6 if burn_factor else 1.2
    power_kw = round((voltage * current) / 1000.0, 3)
    core_temp = 65.0 + (power_kw * 10.0) + min(sensor_age_s, 3.0)
    flow = max(0.002, power_kw * 0.05)

    return {
        "voltage": round(voltage, 1),
        "current": round(current, 2),
        "power_kw": round(power_kw, 3),
        "core_temp_c": round(core_temp, 2),
        "flowmeter_kgh": round(flow, 4),
        "bat_v": 12.9,
    }


def build_payload() -> Dict[str, Any]:
    sensor = get_sensor_snapshot()
    sensor_age_s = (
        max(0.0, time.time() - sensor["last_update_ts"])
        if sensor["last_update_ts"]
        else 999.0
    )

    state = strategy_engine.next_state()
    send_strategy_notification(state["segment_type"])

    pitch = sensor["gx"] / 131.0 if arduino_connected else 0.0
    roll = sensor["gy"] / 131.0 if arduino_connected else 0.0
    yaw = sensor["gz"] / 131.0 if arduino_connected else 0.0
    steering = clamp(sensor["str"], -135.0, 135.0) if arduino_connected else 0.0

    ride_height = {
        "fl": round(30.5 - (roll * 0.12) - (pitch * 0.08), 1),
        "fr": round(30.5 + (roll * 0.12) - (pitch * 0.08), 1),
        "rl": round(38.0 - (roll * 0.10) + (pitch * 0.08), 1),
        "rr": round(38.0 + (roll * 0.10) + (pitch * 0.08), 1),
    }

    payload = {
        "ts": time.time(),
        "source": {
            "arduino_connected": arduino_connected,
            "serial_port": SERIAL_PORT,
            "sensor_age_ms": int(sensor_age_s * 1000) if sensor["last_update_ts"] else None,
        },
        "h2_status": synthesize_h2_status(state, sensor_age_s),
        "dynamics": {
            "speed_kmh": round(state["speed_kmh"], 2),
            "accel_g": round(state["accel_g"], 3),
            "velocity_ms": round(state["speed_kmh"] / 3.6, 3),
        },
        "mpu": {
            "pitch": round(pitch, 2),
            "roll": round(roll, 2),
            "yaw": round(yaw, 2),
            "ride_height": ride_height,
        },
        "driver": {
            "steering_angle": round(steering, 1),
            "throttle_pc": round(state["throttle_pc"], 1),
            "brake_pc": round(state["brake_pc"], 1),
        },
        "gps": {
            "lat": state.get("lat", DEFAULT_LAT),
            "lng": state.get("lng", DEFAULT_LNG),
        },
        "weather": {
            "air_temp_c": 27.0,
            "track_temp_c": 39.0,
            "humidity_pc": 45.0,
        },
    }

    payload = strategy_engine.enrich_payload(payload, state)
    payload["strategy"]["target_speed_kmh"] = round(
        strategy_engine.config.burn_off_threshold_mps * 3.6,
        1,
    )
    return payload


def merge_external_payload(base_payload: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Merge externally posted telemetry without dropping Arduino/strategy fields."""
    merged = dict(base_payload)

    for key in ("h2_status", "dynamics", "mpu", "driver", "gps", "weather", "strategy", "source"):
        incoming = override.get(key)
        if isinstance(incoming, dict):
            merged.setdefault(key, {})
            merged[key].update(incoming)

    for key, value in override.items():
        if key not in merged or not isinstance(value, dict):
            merged[key] = value

    merged["ts"] = override.get("ts", base_payload["ts"])
    return merged


def telemetry_broadcast_loop() -> None:
    """Emit telemetry to the dashboard at 20 Hz."""
    while True:
        payload = build_payload()
        with telemetry_override_lock:
            override = latest_external_payload
            override_age = time.time() - latest_external_payload_ts if latest_external_payload_ts else None

        if override and override_age is not None and override_age < 1.0:
            payload = merge_external_payload(payload, override)

        socketio.emit("telemetry_update", payload)
        socketio.sleep(0.05)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/plots")
def plots():
    return render_template("plots.html")


@app.route("/api/track_coords")
def track_coords():
    return jsonify({"coords": strategy_engine.track_points})


@app.route("/api/status")
def status():
    sensor = get_sensor_snapshot()
    return jsonify(
        {
            "arduino_connected": arduino_connected,
            "serial_port": SERIAL_PORT,
            "baudrate": SERIAL_BAUDRATE,
            "last_sensor_update_ts": sensor["last_update_ts"] or None,
            "strategy_mode": "burn" if strategy_engine.is_burning else "coast",
        }
    )


@app.route("/api/telemetry", methods=["POST"])
def ingest_telemetry():
    global latest_external_payload, latest_external_payload_ts

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "error": "JSON object required"}), 400

    with telemetry_override_lock:
        latest_external_payload = payload
        latest_external_payload_ts = time.time()

    return jsonify({"ok": True})


if __name__ == "__main__":
    threading.Thread(target=arduino_reader, daemon=True).start()
    socketio.start_background_task(telemetry_broadcast_loop)
    print("Dashboard server starting on http://127.0.0.1:5050")
    socketio.run(app, host="0.0.0.0", port=5050, debug=False)
