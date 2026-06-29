#!/usr/bin/env python3
"""Seed New Mexico pilot car listings (no public login required)."""

import json
import sys
import urllib.error
import urllib.request

SUPABASE_URL = "https://jefzhadejttqniktjtpu.supabase.co"
ANON_KEY = "sb_publishable_WTFyVuiEIYsYYKSUYB7RRQ_-vMnviAJ"
TEST_PASSWORD = "TestPilot2026!"

DRIVERS = [
    {
        "email": "anstorm@pilotcar4hire.com",
        "name": "Anstorm Sabre PCS",
        "business_name": "Anstorm Sabre PCS, LLC",
        "home_city": "Albuquerque",
        "home_state": "NM",
        "phone": "(402) 270-2125",
        "years_experience": 12,
        "services": ["Lead", "Chase", "HiPole", "RouteSurvey"],
        "states_certified": ["NM", "AZ", "CO", "TX", "OK"],
        "description": "Albuquerque-based pilot car escorts for oversize loads across the Southwest.",
    },
    {
        "email": "validtransport@pilotcar4hire.com",
        "name": "Valid Transportation",
        "business_name": "Valid Transportation & PCS",
        "home_city": "Santa Rosa",
        "home_state": "NM",
        "phone": "(559) 363-5656",
        "years_experience": 10,
        "services": ["HiPole", "RouteSurvey", "MultipleCars", "Steereman"],
        "states_certified": ["NM", "AZ", "TX", "OK"],
        "description": "Santa Rosa-based pilot car and transportation escorts along I-40 and regional corridors.",
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
        print(f"     Listing ID: {listing.get('id')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())