import requests
import time
import pandas as pd
import random
import re
import os
import argparse
import serial
import csv
import datetime

API_URL = "http://localhost:5050/api/telemetry"
TRACK_PATH = "track/sem-us-2022-track_coordinates.csv"
H2_LOG_PATH = "telemetry/windows/decoded.txt"

# ==========================================
# ROBUST LIVE SERIAL READER CLASS
# ==========================================
class H2SerialReader:
    def __init__(self, port, baudrate, save_csv=False, csv_filename="live_telemetry.csv"):
        # timeout=0 makes it non-blocking, crucial for smooth dashboard streaming
        self.ser = serial.Serial(port, baudrate, timeout=0)
        self.buffer = bytearray()
        self.save_csv = save_csv
        self.csv_file = None
        self.csv_writer = None
        
        if self.save_csv:
            file_exists = os.path.isfile(csv_filename)
            self.csv_file = open(csv_filename, 'a', newline='')
            keys = ['Timestamp', 'Status', 'Amb Temp(C)', 'Stack Temp(C)', 'Stack V(V)', 'Stack I(A)', 'Stack P(W)', 'Bat V(V)']
            self.csv_writer = csv.DictWriter(self.csv_file, fieldnames=keys)
            
            if not file_exists:
                self.csv_writer.writeheader()
            print(f"[!] Live CSV logging enabled: appending to {csv_filename}")

    def read_latest(self):
        """Reads raw binary bytes, buffers them, and decodes full 8-byte packets."""
        try:
            # Read all currently available bytes into the buffer
            if self.ser.in_waiting > 0:
                self.buffer.extend(self.ser.read(self.ser.in_waiting))

            latest_data = None
            
            # Process as long as we have complete 8-byte packets
            while len(self.buffer) >= 8:
                packet = self.buffer[:8]      # Grab 8 bytes
                self.buffer = self.buffer[8:] # Remove them from buffer
                
                data = self._decode_packet(packet)
                if data:
                    latest_data = data
                    
                    if self.save_csv:
                        self._write_to_csv(data)
                        
            return latest_data # Returns the most recent decoded dictionary (or None if no new packets)
            
        except Exception as e:
            print(f"Serial read error: {e}")
            return None

    def _decode_packet(self, packet_bytes):
        """Applies math logic to raw hex bytes."""
        amb_temp = packet_bytes[1] / 2.0
        stack_temp = packet_bytes[2] / 3.0
        stack_current = packet_bytes[4] / 2.0
        bat_voltage = packet_bytes[7] / 10.0
        
        # Return in the format expected by the push script
        return {
            "status": "'NORMAL'",
            "amb_temp": int(amb_temp),
            "stack_temp": stack_temp,
            "stack_v": 0.200000,
            "stack_i": int(stack_current),
            "stack_p": 9.200000,
            "bat_v": bat_voltage,
        }

    def _write_to_csv(self, data):
        """Formats and immediately saves data to disk."""
        csv_row = {
            'Timestamp': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
            'Status': data['status'],
            'Amb Temp(C)': data['amb_temp'],
            'Stack Temp(C)': data['stack_temp'],
            'Stack V(V)': data['stack_v'],
            'Stack I(A)': data['stack_i'],
            'Stack P(W)': data['stack_p'],
            'Bat V(V)': data['bat_v']
        }
        self.csv_writer.writerow(csv_row)
        self.csv_file.flush() # Force write to disk

    def close(self):
        if self.ser and self.ser.is_open:
            self.ser.close()
        if self.csv_file:
            self.csv_file.close()


# ==========================================
# EXISTING FUNCTIONS (Intact)
# ==========================================
def load_track():
    try:
        df = pd.read_csv(TRACK_PATH)
        coords = [{"lat": row["Latitude"], "lng": row["Longitude"]} for _, row in df.iterrows()]
        print(f"Loaded {len(coords)} track coordinates.")
        return coords
    except Exception as e:
        print(f"Error loading track: {e}")
        return []

def load_h2_data():
    data = []
    try:
        with open(H2_LOG_PATH, 'r') as f:
            lines = f.readlines()
            for line in lines[2:]:  
                parts = re.split(r'\s{2,}|\t', line.strip())
                if len(parts) >= 8:
                    try:
                        record = {
                            "amb_temp": float(parts[2]),
                            "stack_temp": float(parts[3]),
                            "stack_v": float(parts[4]),
                            "stack_i": float(parts[5]),
                            "stack_p": float(parts[6]),
                            "bat_v": float(parts[7]),
                        }
                        data.append(record)
                    except ValueError:
                        continue
        print(f"Loaded {len(data)} H2 records from log.")
        return data
    except Exception as e:
        print(f"Error loading H2 log: {e}")
        return []

def read_gps_sensor(): pass
def read_imu_sensor(): pass
def read_weather_sensor(): pass

# ==========================================
# MAIN LOOP
# ==========================================
def main():
    parser = argparse.ArgumentParser(description="Live Telemetry Push Script")
    parser.add_argument('--serial', type=str, help='Path to serial port, e.g., /dev/ttyUSB0', default=None)
    parser.add_argument('--baudrate', type=int, help='Baudrate for serial connection', default=9600)
    # --- NEW FLAGS ---
    parser.add_argument('--save-csv', action='store_true', help='Flag to enable saving serial data to a CSV file')
    parser.add_argument('--csv-file', type=str, help='Name of the output CSV file', default='live_telemetry.csv')
    args = parser.parse_args()

    print("Starting Live Telemetry Push Script...")
    
    use_serial = False
    h2_reader = None

    if args.serial:
        try:
            h2_reader = H2SerialReader(args.serial, args.baudrate, save_csv=args.save_csv, csv_filename=args.csv_file)
            use_serial = True
            print(f"Connected to H2 Fuel Cell on serial port {args.serial} at {args.baudrate} baud.")
        except Exception as e:
            print(f"Failed to connect to serial port {args.serial}: {e}")
            print("Falling back to simulated data from log file.")

    track_coords = load_track()
    h2_records = []
    
    if not use_serial:
        h2_records = load_h2_data()
    
    if not track_coords or (not use_serial and not h2_records):
        print("Missing data required to run simulation.")
        return

    track_idx = 0
    h2_idx = 0
    last_h2_state = None  # Cache for maintaining smooth API pushes
    
    try:
        while True:
            # Get current frame data
            coord = track_coords[track_idx]
            track_idx = (track_idx + 1) % len(track_coords)

            # Call sensor placeholders
            read_gps_sensor()
            read_imu_sensor()
            read_weather_sensor()
            
            if use_serial:
                # Ask the reader if any NEW complete packets arrived
                new_h2 = h2_reader.read_latest()
                
                if new_h2:
                    last_h2_state = new_h2
                
                # If we haven't received ANY data yet since boot, pause and try again
                if not last_h2_state:
                    time.sleep(0.01)
                    continue
                
                # Use the most recently available state for the dashboard push
                h2 = last_h2_state
            else:
                h2 = h2_records[h2_idx]
                h2_idx = (h2_idx + 1) % len(h2_records)
            
            speed = 340.0 + random.uniform(-10, 10)
            
            payload = {
                "ts": time.time(),
                "h2_status": {
                    "voltage": h2["stack_v"],
                    "current": h2["stack_i"],
                    "power_kw": h2["stack_p"] / 1000.0 if h2["stack_p"] > 100 else h2["stack_p"], 
                    "core_temp_c": h2["stack_temp"],
                    "flowmeter_kgh": random.uniform(1.2, 1.3), 
                    "bat_v": h2["bat_v"]
                },
                "dynamics": {
                    "speed_kmh": speed,
                    "accel_g": random.uniform(-1.0, 1.0),
                },
                "mpu": {
                    "pitch": random.uniform(-1.0, 1.0),
                    "roll": random.uniform(-3.0, 3.0),
                    "yaw": random.uniform(-1.0, 1.0),
                    "ride_height": {"fl": 30.5, "fr": 30.5, "rl": 38.0, "rr": 38.0}
                },
                "driver": {
                    "steering_angle": random.uniform(-15.0, 15.0),
                    "throttle_pc": random.uniform(80.0, 100.0),
                    "brake_pc": 0.0,
                },
                "gps": coord,
                "weather": {
                    "air_temp_c": h2["amb_temp"], 
                    "track_temp_c": h2["amb_temp"] + 15.0,
                    "humidity_pc": 45.0
                }
            }
            
            try:
                requests.post(API_URL, json=payload)
            except Exception as e:
                print(f"Failed to push to API: {e}")
                
            time.sleep(0.1) # 10 Hz refresh rate for dashboard

    except KeyboardInterrupt:
        print("\nExiting nicely...")
    finally:
        # Cleanup serial and CSV
        if h2_reader:
            h2_reader.close()

if __name__ == "__main__":
    main()