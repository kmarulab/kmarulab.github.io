import serial
import time
import sys

def read_rs232_port(port_name, baud_rate=9600):
    try:
        # Initialize the serial port
        # 9600 baud, 8 data bits, No parity, 1 stop bit (8N1) 
        # This is the most common default standard for RS-232
        ser = serial.Serial(
            port=port_name,
            baudrate=baud_rate,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            bytesize=serial.EIGHTBITS,
            timeout=1  # 1 second timeout for reading
        )
        print(f"Successfully connected to {port_name} at {baud_rate} baud.")
        print("Listening for raw data... (Press Ctrl+C to stop)\n")

        while True:
            # Check if there are bytes waiting in the input buffer
            if ser.in_waiting > 0:
                # Read all available raw bytes
                raw_data = ser.read(ser.in_waiting)
                
                # 1. Print the raw Python bytes object (e.g., b'\x02Hello\x03')
                print(f"Raw Bytes: {raw_data}")
                
                # 2. Print as Hexadecimal (Best for seeing exact, unprintable RS232 control chars)
                hex_data = " ".join([f"{b:02X}" for b in raw_data])
                print(f"Hex Dump:  {hex_data}")
                
                # 3. Print as ASCII (replaces unreadable bytes with a '?')
                text_data = raw_data.decode('ascii', errors='replace')
                print(f"Text:      {text_data}")
                print("-" * 50)
            
            # Small sleep to prevent the while loop from consuming 100% CPU
            time.sleep(0.01)

    except serial.SerialException as e:
        print(f"\n[!] Serial Error: {e}")
        print("Make sure the port is correct, the device is plugged in, and no other program is using it.")
    except KeyboardInterrupt:
        print("\n[i] User interrupted. Exiting gracefully...")
    finally:
        # Ensure the port is always closed when the script stops
        if 'ser' in locals() and ser.is_open:
            ser.close()
            print("Port successfully closed.")

if __name__ == "__main__":
    # --- CONFIGURATION ---
    # Replace this with the output from `ls /dev/cu.*` in your terminal
    MAC_PORT = '/dev/tty.usbserial-A9OAID1K' 
    
    # Common RS232 baud rates: 9600, 19200, 38400, 57600, 115200
    BAUD_RATE = 9600 
    
    read_rs232_port(MAC_PORT, BAUD_RATE)

# import re
# import csv
# import datetime

# def parse_hex_line(line):
#     """
#     Looks for 8-byte hex payloads in a line of text, handling both:
#     - Pipe-separated: 00|20|8A|00|25|00|01|81|
#     - Space-separated: 00 20 8a 00 1e 00 02 81
#     """
#     # 1. Check for pipe format
#     pipe_match = re.search(r'((?:[0-9A-Fa-f]{2}\|){8})', line)
#     if pipe_match:
#         hex_parts = [h for h in pipe_match.group(1).split('|') if len(h) == 2]
#         return [int(x, 16) for x in hex_parts]
        
#     # 2. Check for space format
#     # Looks for exactly 8 hex pairs separated by spaces
#     space_match = re.search(r'((?:[0-9A-Fa-f]{2}\s){7}[0-9A-Fa-f]{2})', line)
#     if space_match:
#         hex_parts = space_match.group(1).split()
#         # Ensure we aren't accidentally grabbing dates (like 17 02 20 26)
#         # by checking length exactly.
#         if len(hex_parts) == 8:
#             return [int(x, 16) for x in hex_parts]

#     return None

# def decode_packet(packet_bytes):
#     """Applies your math logic to the 8-byte array."""
#     amb_temp = packet_bytes[1] / 2.0
#     stack_temp = packet_bytes[2] / 3.0
#     stack_current = packet_bytes[4] / 2.0
#     bat_voltage = packet_bytes[7] / 10.0
    
#     # Static/Derived values 
#     return {
#         'Status': "'NORMAL'",
#         'Amb Temp(C)': int(amb_temp),
#         'Stack Temp(C)': stack_temp,
#         'Stack V(V)': 0.200000,
#         'Stack I(A)': int(stack_current),
#         'Stack P(W)': 9.200000,
#         'Bat V(V)': bat_voltage
#     }

# def process_log_file(file_path, save_to_csv=False):
#     """Parses the file, prints the clean data, and optionally saves to CSV."""
    
#     # Clean header (no Date/Time)
#     print(f"{'Status':<10} {'Amb Temp(C)':<12} {'Stack Temp(C)':<15} {'Stack V(V)':<12} {'Stack I(A)':<12} {'Stack P(W)':<12} {'Bat V(V)':<10}")
#     print("-" * 90)

#     results = []

#     try:
#         with open(file_path, 'r', encoding='cp1252', errors='ignore') as f:
#             for line in f:
#                 packet = parse_hex_line(line)
#                 if packet:
#                     # Decode the math
#                     data = decode_packet(packet)
                    
#                     # Print to terminal
#                     print(f"{data['Status']:<10} {data['Amb Temp(C)']:<12} {data['Stack Temp(C)']:<15.6f} {data['Stack V(V)']:<12.6f} {data['Stack I(A)']:<12} {data['Stack P(W)']:<12.6f} {data['Bat V(V)']:<10.6f}")
                    
#                     # If CSV is enabled, add the timestamp here and store it
#                     if save_to_csv:
#                         data['Timestamp'] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#                         results.append(data)

#         # Execute optional CSV save
#         if save_to_csv and results:
#             csv_filename = "decoded_telemetry.csv"
#             # Reorder keys to put Timestamp first
#             keys = ['Timestamp', 'Status', 'Amb Temp(C)', 'Stack Temp(C)', 'Stack V(V)', 'Stack I(A)', 'Stack P(W)', 'Bat V(V)']
            
#             with open(csv_filename, 'w', newline='') as output_file:
#                 dict_writer = csv.DictWriter(output_file, fieldnames=keys)
#                 dict_writer.writeheader()
#                 dict_writer.writerows(results)
#             print(f"\n[!] Data saved to {csv_filename} with timestamps.")

#     except FileNotFoundError:
#         print(f"Error: Could not find the file '{file_path}'")
#     except Exception as e:
#         print(f"Error: {e}")

# if __name__ == '__main__':
#     # TO SAVE TO CSV: Change save_to_csv=True
#     process_log_file('/Users/kimaruboruett/Documents/shell-eco/realistic/Indy500Dashboard-main/telemetry/windows/serial.txt', save_to_csv=False)