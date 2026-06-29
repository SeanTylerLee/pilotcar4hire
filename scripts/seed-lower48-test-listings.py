#!/usr/bin/env python3
"""Seed 5 test pilot car accounts per lower-48 state (240 total), spread across each state."""

import json
import sys
import time
import urllib.error
import urllib.request

SUPABASE_URL = "https://jefzhadejttqniktjtpu.supabase.co"
ANON_KEY = "sb_publishable_WTFyVuiEIYsYYKSUYB7RRQ_-vMnviAJ"
TEST_PASSWORD = "TestPilot2026!"
REQUEST_DELAY_SEC = 0.15

# Lower 48: contiguous US states (excludes AK, HI). Five cities per state, different regions.
STATE_CITIES = {
    "AL": ["Huntsville", "Birmingham", "Mobile", "Montgomery", "Dothan"],
    "AZ": ["Phoenix", "Tucson", "Flagstaff", "Yuma", "Show Low"],
    "AR": ["Fayetteville", "Little Rock", "Fort Smith", "Jonesboro", "El Dorado"],
    "CA": ["San Francisco", "Los Angeles", "Sacramento", "San Diego", "Redding"],
    "CO": ["Denver", "Colorado Springs", "Grand Junction", "Fort Collins", "Pueblo"],
    "CT": ["Hartford", "New Haven", "Stamford", "Norwich", "Danbury"],
    "DE": ["Wilmington", "Dover", "Rehoboth Beach", "Newark", "Milford"],
    "FL": ["Jacksonville", "Miami", "Tampa", "Pensacola", "Orlando"],
    "GA": ["Atlanta", "Savannah", "Columbus", "Macon", "Valdosta"],
    "ID": ["Boise", "Coeur d'Alene", "Idaho Falls", "Pocatello", "Twin Falls"],
    "IL": ["Chicago", "Springfield", "Rockford", "Carbondale", "Peoria"],
    "IN": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Terre Haute"],
    "IA": ["Des Moines", "Cedar Rapids", "Sioux City", "Dubuque", "Council Bluffs"],
    "KS": ["Wichita", "Overland Park", "Dodge City", "Hays", "Pittsburg"],
    "KY": ["Louisville", "Lexington", "Bowling Green", "Paducah", "Ashland"],
    "LA": ["New Orleans", "Baton Rouge", "Shreveport", "Lake Charles", "Monroe"],
    "ME": ["Portland", "Bangor", "Presque Isle", "Augusta", "Lewiston"],
    "MD": ["Baltimore", "Frederick", "Salisbury", "Cumberland", "Annapolis"],
    "MA": ["Boston", "Worcester", "Springfield", "Pittsfield", "Hyannis"],
    "MI": ["Detroit", "Grand Rapids", "Marquette", "Lansing", "Traverse City"],
    "MN": ["Minneapolis", "Duluth", "Rochester", "St. Cloud", "Moorhead"],
    "MS": ["Jackson", "Gulfport", "Tupelo", "Hattiesburg", "Vicksburg"],
    "MO": ["Kansas City", "St. Louis", "Springfield", "Columbia", "Joplin"],
    "MT": ["Billings", "Missoula", "Great Falls", "Bozeman", "Glendive"],
    "NE": ["Omaha", "Lincoln", "North Platte", "Scottsbluff", "Norfolk"],
    "NV": ["Las Vegas", "Reno", "Elko", "Carson City", "Ely"],
    "NH": ["Manchester", "Concord", "Portsmouth", "Lebanon", "Berlin"],
    "NJ": ["Newark", "Trenton", "Atlantic City", "Camden", "Morristown"],
    "NM": ["Albuquerque", "Santa Fe", "Las Cruces", "Roswell", "Farmington"],
    "NY": ["Albany", "Buffalo", "Rochester", "Syracuse", "Plattsburgh"],
    "NC": ["Charlotte", "Raleigh", "Wilmington", "Asheville", "Fayetteville"],
    "ND": ["Fargo", "Bismarck", "Minot", "Dickinson", "Grand Forks"],
    "OH": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Athens"],
    "OK": ["Oklahoma City", "Tulsa", "Lawton", "Enid", "Muskogee"],
    "OR": ["Portland", "Eugene", "Bend", "Medford", "Pendleton"],
    "PA": ["Philadelphia", "Pittsburgh", "Harrisburg", "Erie", "Scranton"],
    "RI": ["Providence", "Newport", "Westerly", "Woonsocket", "Warwick"],
    "SC": ["Charleston", "Columbia", "Greenville", "Myrtle Beach", "Florence"],
    "SD": ["Sioux Falls", "Rapid City", "Aberdeen", "Pierre", "Yankton"],
    "TN": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Jackson"],
    "TX": ["Houston", "Dallas", "El Paso", "Amarillo", "McAllen"],
    "UT": ["Salt Lake City", "St. George", "Ogden", "Moab", "Logan"],
    "VT": ["Burlington", "Montpelier", "Brattleboro", "Rutland", "St. Johnsbury"],
    "VA": ["Richmond", "Norfolk", "Roanoke", "Winchester", "Charlottesville"],
    "WA": ["Seattle", "Spokane", "Yakima", "Bellingham", "Kennewick"],
    "WV": ["Charleston", "Huntington", "Morgantown", "Beckley", "Martinsburg"],
    "WI": ["Milwaukee", "Madison", "Green Bay", "Eau Claire", "La Crosse"],
    "WY": ["Cheyenne", "Casper", "Jackson", "Rock Springs", "Gillette"],
}

SERVICE_SETS = [
    ["Lead", "Chase"],
    ["Lead", "Chase", "RouteSurvey"],
    ["Lead", "Chase", "HiPole"],
    ["Lead", "Chase", "Steereman"],
    ["Lead", "Chase", "MultipleCars"],
]

FIRST_NAMES = [
    "Alex", "Jordan", "Casey", "Morgan", "Riley", "Taylor", "Jamie", "Quinn",
    "Drew", "Avery", "Blake", "Cameron", "Dana", "Ellis", "Finley", "Gray",
]

LAST_NAMES = [
    "Miller", "Garcia", "Johnson", "Williams", "Brown", "Davis", "Wilson",
    "Anderson", "Thomas", "Martinez", "Clark", "Lewis", "Walker", "Hall",
]


def build_drivers():
    drivers = []
    slot = 0
    for state in sorted(STATE_CITIES):
        cities = STATE_CITIES[state]
        for idx, city in enumerate(cities, start=1):
            slot += 1
            first = FIRST_NAMES[slot % len(FIRST_NAMES)]
            last = LAST_NAMES[(slot // len(FIRST_NAMES)) % len(LAST_NAMES)]
            name = f"{first} {last}"
            slug_city = city.lower().replace(" ", "-").replace("'", "")
            email = f"seed-{state.lower()}-{idx}@pilotcar4hire.test"
            business = f"{city} Pilot Escort"
            phone = f"({200 + (slot % 800):03d}) 555-{slot % 10000:04d}"
            drivers.append({
                "email": email,
                "name": name,
                "business_name": business,
                "home_city": city,
                "home_state": state,
                "phone": phone,
                "years_experience": 5 + (slot % 18),
                "services": SERVICE_SETS[idx - 1],
                "states_certified": [state],
                "description": (
                    f"Test pilot car escort based in {city}, {state}. "
                    f"Lead and chase services for oversize freight."
                ),
            })
    return drivers


def request(method, path, body=None, token=None, extra_headers=None):
    headers = {
        "apikey": ANON_KEY,
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update(extra_headers)

    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"message": raw}
        return err.code, payload


def signup_or_login(driver):
    status, payload = request(
        "POST",
        "/auth/v1/signup",
        {
            "email": driver["email"],
            "password": TEST_PASSWORD,
            "data": {"name": driver["name"]},
        },
    )

    if status == 200 and payload.get("access_token"):
        return payload

    status, payload = request(
        "POST",
        "/auth/v1/token?grant_type=password",
        {"email": driver["email"], "password": TEST_PASSWORD},
    )
    if status != 200:
        raise RuntimeError(f"Auth failed for {driver['email']}: {payload}")
    return payload


def upsert_listing(driver, session):
    user_id = session["user"]["id"]
    token = session["access_token"]
    row = {
        "user_id": user_id,
        "business_name": driver["business_name"],
        "years_experience": driver["years_experience"],
        "phone": driver["phone"],
        "email": driver["email"],
        "services": driver["services"],
        "states_certified": driver["states_certified"],
        "home_state": driver["home_state"],
        "home_city": driver["home_city"],
        "description": driver["description"],
    }

    status, existing = request(
        "GET",
        f"/rest/v1/listings?user_id=eq.{user_id}&select=id",
        token=token,
    )
    if status != 200:
        raise RuntimeError(f"Listing lookup failed for {driver['email']}: {existing}")

    if existing:
        listing_id = existing[0]["id"]
        status, payload = request(
            "PATCH",
            f"/rest/v1/listings?id=eq.{listing_id}",
            row,
            token=token,
            extra_headers={"Prefer": "return=representation"},
        )
        action = "updated"
    else:
        status, payload = request(
            "POST",
            "/rest/v1/listings",
            row,
            token=token,
            extra_headers={"Prefer": "return=representation"},
        )
        action = "created"

    if status not in (200, 201):
        raise RuntimeError(f"Listing {action} failed for {driver['email']}: {payload}")

    return action


def main():
    drivers = build_drivers()
    total = len(drivers)
    print(f"Seeding {total} test accounts ({len(STATE_CITIES)} states × 5 cities)…\n")

    ok = 0
    failed = []

    for i, driver in enumerate(drivers, start=1):
        try:
            session = signup_or_login(driver)
            action = upsert_listing(driver, session)
            ok += 1
            print(
                f"[{i}/{total}] {driver['home_state']} — "
                f"{driver['business_name']} ({driver['home_city']}) [{action}]"
            )
        except Exception as err:
            failed.append((driver["email"], str(err)))
            print(f"[{i}/{total}] FAIL {driver['email']}: {err}", file=sys.stderr)

        if REQUEST_DELAY_SEC:
            time.sleep(REQUEST_DELAY_SEC)

    print(f"\nDone: {ok}/{total} succeeded.")
    if failed:
        print(f"Failed: {len(failed)}", file=sys.stderr)
        for email, msg in failed[:10]:
            print(f"  - {email}: {msg}", file=sys.stderr)
        if len(failed) > 10:
            print(f"  … and {len(failed) - 10} more", file=sys.stderr)
        return 1

    print(f"\nAll accounts use password: {TEST_PASSWORD}")
    print("Email pattern: seed-{state}-{1-5}@pilotcar4hire.test")
    print("Example: seed-tx-3@pilotcar4hire.test")
    return 0


if __name__ == "__main__":
    sys.exit(main())