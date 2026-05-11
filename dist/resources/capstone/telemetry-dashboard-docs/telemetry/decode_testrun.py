#!/usr/bin/env python3
import re
import pandas as pd

TESRUN_PATH = "testrun"
OUT_CSV = "decoded_testrun.csv"

def sanitize(s: str) -> str:
    s = "".join(ch for ch in s if 32 <= ord(ch) < 127)
    s = s.strip()
    s = re.sub(r"\d+$", "", s)  # drop trailing digits from weird metadata
    return s

def next_ascii_token(buf: bytes, i: int):
    n = len(buf)
    while i < n and not (32 <= buf[i] < 127):
        i += 1
    if i >= n:
        return None, n
    j = i
    while j < n and (32 <= buf[j] < 127):
        j += 1
    return buf[i:j].decode("ascii", "ignore"), j

def main():
    raw = open(TESRUN_PATH, "rb").read()

    # --- headers ---
    anchor = b"Date & Time"
    a = raw.find(anchor)
    if a == -1:
        raise SystemExit("Header anchor not found. Is this the right file?")
    win = raw[a : a + 900]
    tokens = [t.decode("utf-8", "ignore") for t in win.split(b"\x00") if t]
    k = next(i for i, t in enumerate(tokens) if "Date & Time" in t)
    headers = [sanitize(t) for t in tokens[k : k + 8]]

    # --- records ---
    ts_re = re.compile(rb"'(\d{1,2}/\d{1,2}/\d{4} \d{1,2}:\d{2}:\d{2} [AP]M)'")
    rows = []
    for m in ts_re.finditer(raw):
        i = m.start()
        t0, i2 = next_ascii_token(raw, i)     # 'M/D/YYYY H:MM:SS PM'
        t1, i3 = next_ascii_token(raw, i2)    # 'NORMAL' / 'ERROR' / etc.
        if not (t0 and t1 and t0.startswith("'") and t1.startswith("'")):
            continue

        nums = []
        idx = i3
        ok = True
        for _ in range(6):  # 6 numeric telemetry fields
            tok, idx = next_ascii_token(raw, idx)
            if tok is None or not re.fullmatch(r"[-+]?\d+(\.\d+)?", tok):
                ok = False
                break
            nums.append(float(tok))

        if ok:
            rows.append([t0.strip("'"), t1.strip("'")] + nums)

    df = pd.DataFrame(rows, columns=headers)
    df["Date & Time"] = pd.to_datetime(df["Date & Time"], format="%m/%d/%Y %I:%M:%S %p", errors="coerce")

    # sanity check
    df["Computed Stack Power (V*I) [W]"] = df["Stack Voltage(V)"] * df["Stack Current(A)"]
    df["Stack Power Error (logged - V*I) [W]"] = df["Stack Power(W)"] - df["Computed Stack Power (V*I) [W]"]

    df.to_csv(OUT_CSV, index=False)
    print(f"Wrote {OUT_CSV} with {len(df)} rows.")

if __name__ == "__main__":
    main()
