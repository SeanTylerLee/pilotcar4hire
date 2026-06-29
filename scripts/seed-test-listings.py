#!/usr/bin/env python3
"""Create test pilot car accounts + listings in Supabase."""

import json
import sys
import urllib.error
import urllib.request

SUPABASE_URL = "https://jefzhadejttqniktjtpu.supabase.co"
ANON_KEY = "sb_publishable_WTFyVuiEIYsYYKSUYB7RRQ_-vMnviAJ"
TEST_PASSWORD = "TestPilot2026!"

TEST_DRIVERS = [
    {
        "email": "pilot1@pilotcar4hire.test",
        "name": "Mike Sullivan",
        "business_name": "Cascade Pilot Services",
        "home_city": "Seattle",
        "home_state": "WA",
        "phone": "(206) 555-0101",
        "years_experience": 14,
        "services": ["Lead", "Chase", "RouteSurvey"],
        "states_certified": ["WA", "OR", "ID"],
        "description": "Pacific Northwest oversize escorts. Lead and chase with route survey support.",
    },
    {
        "email": "pilot2@pilotcar4hire.test",
        "name": "Rosa Delgado",
        "business_name": "Desert Sun Escorts",
        "home_city": "Phoenix",
        "home_state": "AZ",
        "phone": "(602) 555-0102",
        "years_experience": 9,
        "services": ["Lead", "Chase", "HiPole"],
        "states_certified": ["AZ", "NM", "CA", "NV"],
        "description": "Desert southwest pilot cars for wide and tall loads.",
    },
    {
        "email": "pilot3@pilotcar4hire.test",
        "name": "James Whitaker",
        "business_name": "Rocky Mountain Pilot Co.",
        "home_city": "Denver",
        "home_state": "CO",
        "phone": "(303) 555-0103",
        "years_experience": 18,
        "services": ["Lead", "Chase", "Steereman", "MultipleCars"],
        "states_certified": ["CO", "WY", "NE", "KS"],
        "description": "Mountain corridor escorts with steer support and multi-car moves.",
    },
    {
        "email": "pilot4@pilotcar4hire.test",
        "name": "Teresa Nguyen",
        "business_name": "Lone Star Pilot Cars",
        "home_city": "Amarillo",
        "home_state": "TX",
        "phone": "(806) 555-0104",
        "years_experience": 11,
        "services": ["Lead", "Chase", "RouteSurvey"],
        "states_certified": ["TX", "OK", "NM"],
        "description": "Panhandle-based escorts covering I-40 and I-27 corridors.",
    },
    {
        "email": "pilot5@pilotcar4hire.test",
        "name": "Carl Becker",
        "business_name": "Heartland Escort LLC",
        "home_city": "Kansas City",
        "home_state": "MO",
        "phone": "(816) 555-0105",
        "years_experience": 16,
        "services": ["Lead", "Chase", "HiPole"],
        "states_certified": ["MO", "KS", "IA", "NE"],
        "description": "Midwest pilot car coverage for cross-country heavy hauls.",
    },
    {
        "email": "pilot6@pilotcar4hire.test",
        "name": "Dana Brooks",
        "business_name": "Music City Pilots",
        "home_city": "Nashville",
        "home_state": "TN",
        "phone": "(615) 555-0106",
        "years_experience": 8,
        "services": ["Lead", "Chase"],
        "states_certified": ["TN", "KY", "AL", "GA"],
        "description": "Southeast regional escorts based in middle Tennessee.",
    },
    {
        "email": "pilot7@pilotcar4hire.test",
        "name": "Andre Jackson",
        "business_name": "Peach State Pilot Cars",
        "home_city": "Savannah",
        "home_state": "GA",
        "phone": "(912) 555-0107",
        "years_experience": 12,
        "services": ["Lead", "Chase", "RouteSurvey", "MultipleCars"],
        "states_certified": ["GA", "SC", "FL", "AL"],
        "description": "Coastal and interstate escorts throughout the Deep South.",
    },
    {
        "email": "pilot8@pilotcar4hire.test",
        "name": "Maria Lopez",
        "business_name": "Sunshine Pilot Services",
        "home_city": "Miami",
        "home_state": "FL",
        "phone": "(305) 555-0108",
        "years_experience": 7,
        "services": ["Lead", "Chase", "HiPole"],
        "states_certified": ["FL", "GA", "AL"],
        "description": "South Florida pilot cars for port and interstate oversize freight.",
    },
    {
        "email": "pilot9@pilotcar4hire.test",
        "name": "Patrick O'Neill",
        "business_name": "Northeast Pilot Group",
        "home_city": "Boston",
        "home_state": "MA",
        "phone": "(617) 555-0109",
        "years_experience": 20,
        "services": ["Lead", "Chase", "Steereman", "RouteSurvey"],
        "states_certified": ["MA", "NH", "RI", "CT", "NY"],
        "description": "New England corridor specialists with route survey experience.",
    },
    {
        "email": "pilot10@pilotcar4hire.test",
        "name": "Linda Erickson",
        "business_name": "Northern Plains Escorts",
        "home_city": "Fargo",
        "home_state": "ND",
        "phone": "(701) 555-0110",
        "years_experience": 13,
        "services": ["Lead", "Chase", "HiPole", "MultipleCars"],
        "states_certified": ["ND", "SD", "MN", "MT"],
        "description": "Northern tier escorts for wind, oilfield, and agricultural equipment.",
    },
]


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

    return action, payload[0] if isinstance(payload, list) else payload


def main():
    results = []
    for driver in TEST_DRIVERS:
        session = signup_or_login(driver)
        action, listing = upsert_listing(driver, session)
        results.append(
            {
                "email": driver["email"],
                "password": TEST_PASSWORD,
                "name": driver["name"],
                "business": driver["business_name"],
                "location": f"{driver['home_city']}, {driver['home_state']}",
                "action": action,
                "listing_id": listing.get("id"),
            }
        )
        print(f"[ok] {driver['business_name']} — {driver['home_city']}, {driver['home_state']} ({action})")

    print("\nTest accounts ready:\n")
    for row in results:
        print(
            f"- {row['business']} ({row['location']})\n"
            f"  Email: {row['email']}\n"
            f"  Password: {row['password']}\n"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())