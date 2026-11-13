"""Air-quality passthrough for Sanjeevani. No API key required (Open-Meteo is free
and keyless). Only ever handles coordinates in-memory/short-lived cache — the
caller (main.py) is responsible for never persisting raw lat/lon in patient
records; this module just resolves an AQI reading for a rounded location."""
import time

import httpx

AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
CACHE_TTL_SECONDS = 15 * 60

# [concLow, concHigh, aqiLow, aqiHigh] per CPCB National AQI standard
_CPCB = {
    "pm2_5": [
        (0, 30, 0, 50), (31, 60, 51, 100), (61, 90, 101, 200),
        (91, 120, 201, 300), (121, 250, 301, 400), (251, 500, 401, 500),
    ],
    "pm10": [
        (0, 50, 0, 50), (51, 100, 51, 100), (101, 250, 101, 200),
        (251, 350, 201, 300), (351, 430, 301, 400), (431, 600, 401, 500),
    ],
}

_BANDS = [
    (50, "Good"), (100, "Satisfactory"), (200, "Moderate"),
    (300, "Poor"), (400, "Very Poor"), (500, "Severe"),
]

# In-memory cache keyed by rounded (lat, lon) — coordinates never touch disk.
_cache = {}


def _sub_index(pollutant, conc):
    if conc is None:
        return None
    bands = _CPCB[pollutant]
    if conc >= bands[-1][1]:
        return 500
    for c_lo, c_hi, a_lo, a_hi in bands:
        if conc <= c_hi:
            return round(a_lo + ((conc - c_lo) / (c_hi - c_lo)) * (a_hi - a_lo))
    return None


def _band_name(aqi):
    for max_val, name in _BANDS:
        if aqi <= max_val:
            return name
    return _BANDS[-1][1]


def _indian_aqi(pm25, pm10):
    s25 = _sub_index("pm2_5", pm25)
    s10 = _sub_index("pm10", pm10)
    if s25 is None and s10 is None:
        return None, "—"
    if (s25 or -1) >= (s10 or -1):
        return s25, "PM2.5"
    return s10, "PM10"


async def fetch_air_quality(lat: float, lon: float) -> dict:
    """Returns {aqi, band, dominant, pm2_5, pm10} for a location, or a dict with
    success=False on failure. Cached for CACHE_TTL_SECONDS to avoid hammering the
    upstream API on repeated widget loads."""
    key = (round(lat, 2), round(lon, 2))
    cached = _cache.get(key)
    if cached and time.time() - cached["ts"] < CACHE_TTL_SECONDS:
        return cached["data"]

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                AIR_QUALITY_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "pm10,pm2_5",
                },
            )
        resp.raise_for_status()
        current = resp.json().get("current", {})
        pm25 = current.get("pm2_5")
        pm10 = current.get("pm10")
        aqi, dominant = _indian_aqi(pm25, pm10)
        if aqi is None:
            return {"success": False}
        data = {
            "success": True,
            "aqi": aqi,
            "band": _band_name(aqi),
            "dominant": dominant,
            "pm2_5": pm25,
            "pm10": pm10,
        }
        _cache[key] = {"ts": time.time(), "data": data}
        return data
    except Exception as e:
        print(f"Air quality lookup failed: {e}")
        return {"success": False}
