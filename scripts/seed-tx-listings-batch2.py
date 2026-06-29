#!/usr/bin/env python3
"""Seed Texas pilot car listings."""

import json
import sys
import urllib.error
import urllib.request

SUPABASE_URL = "https://jefzhadejttqniktjtpu.supabase.co"
ANON_KEY = "sb_publishable_WTFyVuiEIYsYYKSUYB7RRQ_-vMnviAJ"
TEST_PASSWORD = "TestPilot2026!"

# Service codes: 1=HiPole, 2=RouteSurvey, 3=MultipleCars, 4=Steereman
ALL_SPECIALTY = ["HiPole", "RouteSurvey", "MultipleCars", "Steereman"]

DRIVERS = [
    {
        "email": "hotshots@pilotcar4hire.com",
        "name": "Hot Shots Pilot Car",
        "business_name": "Hot Shots Pilot Car",
        "home_city": "Belton",
        "home_state": "TX",
        "phone": "(254) 228-3042",
        "years_experience": 10,
        "services": ALL_SPECIALTY,
        "states_certified": ["TX", "OK", "NM", "LA"],
        "description": "Belton-based pilot car escorts for oversize loads across Central Texas.",
    },
    {
        "email": "northamerican@pilotcar4hire.com",
        "name": "North American Transport",
        "business_name": "North American Transport Svcs.",
        "home_city": "Amarillo",
        "home_state": "TX",
        "phone": "(217) 860-2201",
        "years_experience": 12,
        "services": ALL_SPECIALTY,
        "states_certified": ["TX", "OK", "NM", "KS", "CO"],
        "description": "Amarillo-based pilot car and transport escorts along I-40 and Panhandle corridors.",
    },
    {
        "email": "apatel@pilotcar4hire.com",
        "name": "A Patel Pilot Car",
        "business_name": "A Patel Pilot Car Company",
        "home_city": "Dallas",
        "home_state": "TX",
        "phone": "(785) 206-0065",
        "years_experience": 14,
        "services": ALL_SPECIALTY,
        "states_certified": ["TX", "OK", "AR", "LA", "NM"],
        "description": "Dallas-based pilot car escorts serving North Texas and regional oversize routes.",
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
    for driver in DRIVERS:
        session = signup_or_login(driver)
        action, listing = upsert_listing(driver, session)
        print(
            f"[ok] {driver['business_name']} — {driver['home_city']}, {driver['home_state']} "
            f"({action}) · {driver['phone']}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())