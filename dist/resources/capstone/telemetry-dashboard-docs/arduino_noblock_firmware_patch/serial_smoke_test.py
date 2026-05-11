"""Minimal Arduino telemetry smoke test.
Run this before the full dashboard to verify that the Arduino is producing stable JSON.

Usage:
  export ARDUINO_SERIAL_PORT=/dev/cu.usbmodem8301
  python serial_smoke_test.py
"""
import json
import os
import time

import serial

PORT = os.environ.get("ARDUINO_SERIAL_PORT", "/dev/cu.usbmodem8301")
BAUD = int(os.environ.get("ARDUINO_BAUDRATE", "115200"))

with serial.Serial(PORT, BAUD, timeout=1.0) as ser:
    time.sleep(2.0)
    ser.reset_input_buffer()
    print(f"Reading {PORT} at {BAUD} baud. Press Ctrl+C to stop.\n")
    while True:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if not line:
            print("timeout: no frame")
            continue
        try:
            data = json.loads(line)
            print(data)
        except json.JSONDecodeError:
            print("bad frame:", repr(line))
