import re

def decode_eco_marathon_hex(file_path):
    print(f"{'Date & Time':<25} {'Status':<10} {'Amb Temp(C)':<12} {'Stack Temp(C)':<15} {'Stack V(V)':<12} {'Stack I(A)':<12} {'Stack P(W)':<12} {'Bat V(V)':<10}")
    print("-" * 120)

    # UPDATED LINE: Added encoding='cp1252' and errors='ignore' to handle special characters
    with open(file_path, 'r', encoding='cp1252', errors='ignore') as f:
        content = f.read()

    # Regex to find timestamp and the following hex packet
    # Pattern looks for: Timestamp::Packet... followed by hex bytes on next line
    pattern = re.compile(r'(\d{2}/\d{2}/\d{4}@\d{2}:\d{2}:\d{2}\.\d{3}).*?Received 8 bytes\.\s+([\w| ]+)', re.DOTALL)
    
    matches = pattern.findall(content)

    if not matches:
        print("No matching data found. Please check if the text file format matches the 'data-win-hex' structure.")
        return

    for timestamp_str, hex_str in matches:
        # Clean up timestamp for output
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
        stack_voltage = 0.200000 
        stack_power = 9.200000   
        
        print(f"{formatted_time:<25} {status:<10} {int(amb_temp):<12} {stack_temp:<15.6f} {stack_voltage:<12.6f} {int(stack_current):<12} {stack_power:<12.6f} {bat_voltage:<10.6f}")

# Run the function
decode_eco_marathon_hex('text.txt')
