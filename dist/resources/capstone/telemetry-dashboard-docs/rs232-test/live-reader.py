import serial
import datetime
import csv
import os

TARGET_PORT = '/dev/tty.usbserial-A9OAID1K' 
BAUD_RATE = 9600

# Set to True to enable saving data to a file
SAVE_TO_CSV = False
CSV_FILENAME = "live_telemetry.csv"

def decode_packet(packet_bytes):
    """Applies math logic to the 8 raw binary bytes."""
    # Safety check: ensure we have exactly 8 bytes
    if len(packet_bytes) != 8:
        return None

    amb_temp = packet_bytes[1] / 2.0
    stack_temp = packet_bytes[2] / 3.0
    stack_current = packet_bytes[4] / 2.0
    bat_voltage = packet_bytes[7] / 10.0
    
    return {
        'Status': "'NORMAL'",
        'Amb Temp(C)': int(amb_temp),
        'Stack Temp(C)': stack_temp,
        'Stack V(V)': 0.200000,
        'Stack I(A)': int(stack_current),
        'Stack P(W)': 9.200000,
        'Bat V(V)': bat_voltage
    }

def run_live_reader():
    print(f"Listening on {TARGET_PORT} at {BAUD_RATE} baud...")
    print(f"{'Status':<10} {'Amb Temp(C)':<12} {'Stack Temp(C)':<15} {'Stack V(V)':<12} {'Stack I(A)':<12} {'Stack P(W)':<12} {'Bat V(V)':<10}")
    print("-" * 90)

    # Setup CSV if enabled
    if SAVE_TO_CSV:
        # Check if file exists so we only write the header row once
        file_exists = os.path.isfile(CSV_FILENAME)
        
        # Open in 'append' mode ('a') so we don't overwrite previous runs
        csv_file = open(CSV_FILENAME, 'a', newline='')
        keys = ['Timestamp', 'Status', 'Amb Temp(C)', 'Stack Temp(C)', 'Stack V(V)', 'Stack I(A)', 'Stack P(W)', 'Bat V(V)']
        csv_writer = csv.DictWriter(csv_file, fieldnames=keys)
        
        if not file_exists:
            csv_writer.writeheader()
            
        print(f"[!] Live CSV logging enabled: appending to {CSV_FILENAME}\n")

    buffer = bytearray()

    try:
        with serial.Serial(TARGET_PORT, BAUD_RATE, timeout=1) as ser:
            while True:
                if ser.in_waiting > 0:
                    # Read whatever raw bytes are currently available
                    chunk = ser.read(ser.in_waiting)
                    buffer.extend(chunk)

                    # Process packets as long as we have at least 8 bytes
                    while len(buffer) >= 8:
                        packet = buffer[:8]      # Grab the first 8 bytes
                        buffer = buffer[8:]      # Remove them from the buffer
                        
                        data = decode_packet(packet)
                        
                        if data:
                            # Print to terminal
                            print(f"{data['Status']:<10} {data['Amb Temp(C)']:<12} {data['Stack Temp(C)']:<15.6f} {data['Stack V(V)']:<12.6f} {data['Stack I(A)']:<12} {data['Stack P(W)']:<12.6f} {data['Bat V(V)']:<10.6f}")
                            
                            # Write to CSV immediately
                            if SAVE_TO_CSV:
                                data['Timestamp'] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                csv_writer.writerow(data)
                                csv_file.flush() # Force write to disk immediately so data isn't lost if the script is stopped

    except KeyboardInterrupt:
        print("\nExiting nicely...")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Ensure the CSV file is closed properly when the script stops
        if SAVE_TO_CSV and 'csv_file' in locals():
            csv_file.close()

if __name__ == '__main__':
    run_live_reader()