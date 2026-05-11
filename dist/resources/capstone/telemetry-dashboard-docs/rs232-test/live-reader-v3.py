import serial

TARGET_PORT = '/dev/tty.usbserial-A9OAID1K' 
BAUD_RATE = 9600

def decode_packet(packet_bytes):
    """Applies exact resolutions from the Fuel Cell Documentation to the 8 raw bytes."""
    if len(packet_bytes) != 8:
        return None

    # Byte 0: Status
    status = "'NORMAL'" if packet_bytes[0] == 0 else f"'ERR_{packet_bytes[0]:02X}'"

    # Byte 1: Stack Temp (Resolution: 0.5C)
    stack_temp = packet_bytes[1] * 0.5

    # Bytes 2 & 3: Stack Voltage (16-bit Little-Endian, Resolution: 0.3V)
    stack_voltage = ((packet_bytes[3] << 8) | packet_bytes[2]) * 0.3

    # Bytes 4 & 5: Fuel Cell Power (16-bit Little-Endian, Resolution: 1W)
    stack_power = float((packet_bytes[5] << 8) | packet_bytes[4])

    # Byte 6: Stack Current (Resolution: 0.3A)
    stack_current = packet_bytes[6] * 0.3

    # Byte 7: Battery Voltage (Resolution: 0.1V to fit 11-14V range constraint)
    bat_voltage = packet_bytes[7] * 0.1
    
    return {
        'Status': status,
        'Stack Temp(C)': stack_temp,
        'Stack V(V)': stack_voltage,
        'Stack I(A)': stack_current,
        'Stack P(W)': stack_power,
        'Bat V(V)': bat_voltage
    }

def run_live_reader():
    print(f"Listening on {TARGET_PORT} at {BAUD_RATE} baud...")
    print(f"{'Status':<10} {'Stack Temp(C)':<15} {'Stack V(V)':<12} {'Stack I(A)':<12} {'Stack P(W)':<12} {'Bat V(V)':<10}")
    print("-" * 80)

    buffer = bytearray()

    try:
        with serial.Serial(TARGET_PORT, BAUD_RATE, timeout=1) as ser:
            while True:
                if ser.in_waiting > 0:
                    chunk = ser.read(ser.in_waiting)
                    buffer.extend(chunk)

                    # Frame synchronization: slide window until we find a valid packet signature
                    while len(buffer) >= 8:
                        # Check if Byte 0 is NORMAL (0x00) and Byte 7 is a sane Bat Voltage (e.g., 10.0V to 15.0V -> hex 0x64 to 0x96)
                        if buffer[0] == 0x00 and 0x64 <= buffer[7] <= 0x96:
                            packet = buffer[:8]      
                            buffer = buffer[8:]      
                            
                            data = decode_packet(packet)
                            
                            if data:
                                print(f"{data['Status']:<10} {data['Stack Temp(C)']:<15.1f} {data['Stack V(V)']:<12.1f} {data['Stack I(A)']:<12.1f} {data['Stack P(W)']:<12.1f} {data['Bat V(V)']:<10.1f}")
                        else:
                            # Frame is misaligned (dropped a byte). Shift the buffer by 1 byte and scan again.
                            buffer.pop(0)

    except KeyboardInterrupt:
        print("\nExiting nicely...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    run_live_reader()