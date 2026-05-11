#!/usr/bin/env python3
import re
import pandas as pd

HEX_LOG_PATH = "data-win-hex.txt"
OUT_CSV = "parsed_hex_frames.csv"

ts_pat = re.compile(r"^(\d{2}/\d{2}/\d{4})@(\d{2}:\d{2}:\d{2}\.\d{3})::Packet")

def main():
    lines = open(HEX_LOG_PATH, "r", errors="ignore").read().splitlines()

    rows = []
    cur_ts = None
    for line in lines:
        m = ts_pat.match(line.strip())
        if m:
            cur_ts = f"{m.group(1)} {m.group(2)}"
            continue

        if cur_ts and "|" in line:
            # the file has an ASCII side-by-side view; keep only the hex pipe part
            hexpart = line.split("  ")[0].strip()
            parts = [p for p in hexpart.split("|") if p]
            if not parts:
                continue
            try:
                b = [int(p, 16) for p in parts]
            except ValueError:
                continue

            opcode = b[2] if len(b) >= 3 else None

            # Heuristic: opcode 0x8A looks like: [.., op, reg_hi, reg_lo, val_hi, val_lo, crc]
            reg = val = None
            if len(b) >= 7 and opcode == 0x8A:
                reg = (b[3] << 8) | b[4]
                val = (b[5] << 8) | b[6]

            rows.append(
                dict(
                    timestamp=cur_ts,
                    nbytes=len(b),
                    opcode=opcode,
                    reg=reg,
                    value=val,
                    bytes=" ".join(f"{x:02X}" for x in b),
                )
            )
            cur_ts = None

    df = pd.DataFrame(rows)
    df["timestamp"] = pd.to_datetime(df["timestamp"], format="%d/%m/%Y %H:%M:%S.%f", errors="coerce")
    df.to_csv(OUT_CSV, index=False)
    print(f"Wrote {OUT_CSV} with {len(df)} frames.")

if __name__ == "__main__":
    main()
