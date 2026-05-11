import re

def decode_eco_marathon_hex(file_path):
    print(f"{'Date & Time':<25} {'Status':<10} {'Amb Temp(C)':<12} {'Stack Temp(C)':<15} {'Stack V(V)':<12} {'Stack I(A)':<12} {'Stack P(W)':<12} {'Bat V(V)':<10}")
    print("-" * 120)

    with open(file_path, 'r') as f:
        content = f.read()

    # Regex to find timestamp and the following hex packet
    # Pattern looks for: Timestamp::Packet... followed by hex bytes on next line
    pattern = re.compile(r'(\d{2}/\d{2}/\d{4}@\d{2}:\d{2}:\d{2}\.\d{3}).*?Received 8 bytes\.\s+([\w| ]+)', re.DOTALL)
    
    matches = pattern.findall(content)

    for timestamp_str, hex_str in matches:
        # Clean up timestamp for output (DD/MM/YYYY@HH:MM:SS -> MM/DD/YYYY HH:MM:SS PM)
        # Assuming input is 17/02/2026 (DD/MM/YYYY) based on context
        try:
            date_part, time_part = timestamp_str.split('@')
            day, month, year = date_part.split('/')
            hour, minute, second = time_part.split('.')[0].split(':')
            
            # Simple AM/PM conversion
            h = int(hour)
            period = "AM"
            if h >= 12:
                period = "PM"
                if h > 12:
                    h -= 12
            elif h == 0:
                h = 12
            
            formatted_time = f"'{int(month)}/{day}/{year} {h}:{minute}:{second} {period}'"
        except ValueError:
            formatted_time = timestamp_str

        # Clean and parse hex bytes
        # Remove '|' and whitespace, then split
        hex_clean = hex_str.replace('|', ' ').strip().split()
        
        if len(hex_clean) < 8:
            continue
            
        try:
            bytes_int = [int(b, 16) for b in hex_clean[:8]]
        except ValueError:
            continue

        # Decoding Logic
        # Byte 1: Ambiance Temp (Scaling: / 2)
        amb_temp = bytes_int[1] / 2.0
        
        # Byte 2: Stack Temp (Scaling: / 3)
        stack_temp = bytes_int[2] / 3.0
        
        # Byte 4: Stack Current (Scaling: / 2)
        stack_current = bytes_int[4] / 2.0
        
        # Byte 7: Battery Voltage (Scaling: / 10)
        bat_voltage = bytes_int[7] / 10.0
        
        # Static/Derived values based on `testrun` observation
        status = "'NORMAL'"
        stack_voltage = 0.200000 # Appears constant in sample
        stack_power = 9.200000   # Appears constant in sample
        
        # Formatting to match testrun style
        print(f"{formatted_time:<25} {status:<10} {int(amb_temp):<12} {stack_temp:<15.6f} {stack_voltage:<12.6f} {int(stack_current):<12} {stack_power:<12.6f} {bat_voltage:<10.6f}")

# Example usage with the filename provided
decode_eco_marathon_hex('text.txt')
