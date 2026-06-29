#!/usr/bin/env python3
"""Generates images/us-map.svg from js/us-states.geojson."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GEO_PATH = ROOT / "js" / "us-states.geojson"
OUT_PATH = ROOT / "images" / "us-map.svg"

NAME_TO_ABBR = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
    "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY",
}

WIDTH, HEIGHT = 960, 600
CONTINENTAL = {"minLon": -125, "maxLon": -66.4, "minLat": 24, "maxLat": 49.6}
AK_BOUNDS = {"minLon": -180, "maxLon": -129, "minLat": 51, "maxLat": 72}
HI_BOUNDS = {"minLon": -161, "maxLon": -154, "minLat": 18, "maxLat": 23}


def project(lon, lat, bounds, w, h):
    x = (lon - bounds["minLon"]) / (bounds["maxLon"] - bounds["minLon"]) * w
    y = (bounds["maxLat"] - lat) / (bounds["maxLat"] - bounds["minLat"]) * h
    return x, y


def ring_to_path(ring, bounds, w, h):
    parts = []
    for i, (lon, lat) in enumerate(ring):
        x, y = project(lon, lat, bounds, w, h)
        parts.append(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}")
    return " ".join(parts) + " Z"


def geometry_to_path(geometry, bounds, w, h):
    paths = []
    gtype = geometry["type"]
    coords = geometry["coordinates"]
    if gtype == "Polygon":
        for ring in coords:
            paths.append(ring_to_path(ring, bounds, w, h))
    elif gtype == "MultiPolygon":
        for poly in coords:
            for ring in poly:
                paths.append(ring_to_path(ring, bounds, w, h))
    return " ".join(paths)


def main():
    geojson = json.loads(GEO_PATH.read_text())
    continental, alaska, hawaii = [], [], []

    for feature in geojson["features"]:
        name = feature["properties"]["name"]
        abbr = NAME_TO_ABBR.get(name)
        if not abbr:
            continue
        if abbr == "AK":
            d = geometry_to_path(feature["geometry"], AK_BOUNDS, 280, 200)
            alaska.append((abbr, name, d))
        elif abbr == "HI":
            d = geometry_to_path(feature["geometry"], HI_BOUNDS, 200, 130)
            hawaii.append((abbr, name, d))
        else:
            d = geometry_to_path(feature["geometry"], CONTINENTAL, WIDTH, HEIGHT)
            continental.append((abbr, name, d))

    continental.sort(key=lambda s: s[0])

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600" role="img" aria-label="Map of the United States">',
        '  <g id="continental">',
    ]
    for abbr, name, d in continental:
        lines.append(f'    <path id="state-{abbr}" class="state" data-state="{abbr}" data-name="{name}" d="{d}"/>')
    lines.append('  </g>')
    lines.append('  <g id="alaska" transform="translate(20, 420) scale(0.55)">')
    for abbr, name, d in alaska:
        lines.append(f'    <path id="state-{abbr}" class="state" data-state="{abbr}" data-name="{name}" d="{d}"/>')
    lines.append('  </g>')
    lines.append('  <g id="hawaii" transform="translate(280, 500) scale(0.9)">')
    for abbr, name, d in hawaii:
        lines.append(f'    <path id="state-{abbr}" class="state" data-state="{abbr}" data-name="{name}" d="{d}"/>')
    lines.append('</svg>')

    OUT_PATH.write_text("\n".join(lines) + "\n")
    print(f"Wrote {OUT_PATH} ({len(continental) + len(alaska) + len(hawaii)} states)")


if __name__ == "__main__":
    main()
