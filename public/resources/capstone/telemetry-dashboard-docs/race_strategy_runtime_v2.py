import math
import os
import time
import pandas as pd
import numpy as np
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

@dataclass
class VehicleParams:
    mass_kg: float = 185.0
    rho_air: float = 1.225
    crr: float = 0.0045
    cda_m2: float = 0.19
    motor_power_max_w: float = 1000.0
    motor_force_max_n: float = 190.0
    accel_max_mps2: float = 0.42
    brake_max_mps2: float = 0.90
    g: float = 9.81

@dataclass
class StrategyConfig:
    burn_on_threshold_mps: float = 7.2
    burn_off_threshold_mps: float = 9.2

class RaceStrategyEngine:
    def __init__(self, track_path: Optional[str] = None):
        self.p = VehicleParams()
        self.config = StrategyConfig()
        self.track_points: List[Dict[str, Any]] = []
        self.distances: List[float] = []
        self.total_track_len = 0.0
        self.current_distance_m = 0.0
        self.current_speed_mps = self.config.burn_on_threshold_mps
        self.last_ts: Optional[float] = None
        self.is_burning = False
        if track_path:
            self._load_track(track_path)

    def _haversine(self, p1, p2):
        r = 6371000.0
        lat1, lon1 = math.radians(p1['lat']), math.radians(p1['lng'])
        lat2, lon2 = math.radians(p2['lat']), math.radians(p2['lng'])
        dlat, dlon = lat2 - lat1, lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
        return 2.0 * r * math.asin(math.sqrt(a))

    def _load_track(self, track_path: str):
        try:
            df = pd.read_csv(track_path)
            lat_col = next((c for c in df.columns if any(k in c.lower() for k in ['lat', 'latitude'])), 'lat')
            lon_col = next((c for c in df.columns if any(k in c.lower() for k in ['lon', 'lng', 'longitude'])), 'lng')
            points = [{"lat": float(row[lat_col]), "lng": float(row[lon_col])} for _, row in df.iterrows()]
            dists = [0.0]
            for i in range(len(points) - 1):
                dists.append(dists[-1] + self._haversine(points[i], points[i+1]))
            self.track_points = points
            self.distances = dists
            self.total_track_len = dists[-1] if dists else 0.0
        except Exception as e:
            print(f"Track Load Error: {e}")

    def next_state(self, dt: Optional[float] = None) -> Dict[str, Any]:
        now = time.time()
        if dt is None:
            dt = max(1e-3, now - self.last_ts) if self.last_ts else 0.05
        self.last_ts = now
        if self.current_speed_mps < self.config.burn_on_threshold_mps:
            self.is_burning = True
        elif self.current_speed_mps > self.config.burn_off_threshold_mps:
            self.is_burning = False
        f_res = (0.5 * self.p.rho_air * self.p.cda_m2 * (self.current_speed_mps**2)) + (self.p.mass_kg * self.p.g * self.p.crr)
        f_drv = min(self.p.motor_force_max_n, self.p.motor_power_max_w / max(self.current_speed_mps, 0.5)) if self.is_burning else 0.0
        accel = np.clip((f_drv - f_res) / self.p.mass_kg, -self.p.brake_max_mps2, self.p.accel_max_mps2)
        self.current_speed_mps = max(0.1, self.current_speed_mps + accel * dt)
        self.current_distance_m += self.current_speed_mps * dt
        if len(self.track_points) < 2 or len(self.distances) < 2 or self.total_track_len <= 0:
            return {
                "lat": 39.7931,
                "lng": -86.2352,
                "speed_kmh": self.current_speed_mps * 3.6,
                "accel_g": accel / 9.81,
                "throttle_pc": 100.0 if self.is_burning else 0.0,
                "brake_pc": 0.0,
                "segment_type": "burn" if self.is_burning else "coast",
                "distance_m": self.current_distance_m,
                "progress_pc": 0.0,
            }
        d = self.current_distance_m % self.total_track_len if self.total_track_len > 0 else 0
        idx = np.searchsorted(self.distances, d, side='right')
        p0, p1 = self.track_points[idx-1], self.track_points[idx % len(self.track_points)]
        d0, d1 = self.distances[idx-1], self.distances[idx % len(self.track_points)]
        if idx == len(self.track_points): d1 = self.total_track_len
        ratio = (d - d0) / (d1 - d0) if (d1 - d0) > 0 else 0
        return {
            "lat": p0['lat'] + ratio * (p1['lat'] - p0['lat']), "lng": p0['lng'] + ratio * (p1['lng'] - p0['lng']),
            "speed_kmh": self.current_speed_mps * 3.6, "accel_g": accel / 9.81,
            "throttle_pc": 100.0 if self.is_burning else 0.0, "brake_pc": 0.0,
            "segment_type": "burn" if self.is_burning else "coast", "distance_m": self.current_distance_m,
            "progress_pc": (d / self.total_track_len * 100) if self.total_track_len > 0 else 0
        }

    def enrich_payload(self, payload: Dict[str, Any], state: Dict[str, Any]) -> Dict[str, Any]:
        out = dict(payload)
        out["strategy"] = {
            "mode": state["segment_type"],
            "distance_m": round(state["distance_m"], 2),
            "progress_pc": round(state["progress_pc"], 2),
        }
        return out

def resolve_track_path(folder: str) -> Optional[str]:
    if not os.path.isdir(folder): return None
    for f in os.listdir(folder):
        if f.endswith(".csv"): return os.path.join(folder, f)
    return None
