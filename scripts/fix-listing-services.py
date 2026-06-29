#!/usr/bin/env python3
"""Fix business names and map 1/2/3/4 service codes for real listings."""

import json
import re
import sys
import urllib.error
import urllib.request

SUPABASE_URL = "https://jefzhadejttqniktjtpu.supabase.co"
ANON_KEY = "sb_publishable_WTFyVuiEIYsYYKSUYB7RRQ_-vMnviAJ"
PASSWORD = "TestPilot2026!"

# 1 = HiPole, 2 = RouteSurvey, 3 = MultipleCars, 4 = Steereman
CODE_SERVICES = {
    "1": "HiPole",
    "2": "RouteSurvey",
    "3": "MultipleCars",
    "4": "Steereman",
}

LISTINGS = [
    {
        "email": "roadrunner@pilotcar4hire.com",
        "business_name": "Road Runner Pilot Service LLC",
        "service_codes": "2",
    },
    {
        "email": "anstorm@pilotcar4hire.com",
        "business_name": "Anstorm Sabre PCS, LLC",
        "service_codes": "",
    },
    {
        "email": "validtransport@pilotcar4hire.com",
        "business_name": "Valid Transportation & PCS",
        "service_codes": "1234",
    },
    {
        "email": "hotshots@pilotcar4hire.com",
        "business_name": "Hot Shots Pilot Car",
        "service_codes": "1234",
    },
    {
        "email": "northamerican@pilotcar4hire.com",
        "business_name": "North American Transport Svcs.",
        "service_codes": "1234",
    },
    {
        "email": "apatel@pilotcar4hire.com",
        "business_name": "A Patel Pilot Car Company",
        "service_codes": "1234",
    },
    {
        "email": "midwestpilot@pilotcar4hire.com",
        "business_name": "Midwest Pilot Cars",
        "service_codes": "1234",
    },
]


def services_from_codes(codes):
    if not codes:
        return ["Lead", "Chase"]
    return [CODE_SERVICES[ch] for ch in codes if ch in CODE_SERVICES]


def request(method, path, body=None, token=None, extra_headers=None):
    headers = {"apikey": ANON_KEY, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update(extra_headers)
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(f"{SUPABASE_URL}{path}", data=data, headers=headers, method=method)
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


def login(email):
    status, payload = request(
        "POST",
        "/auth/v1/token?grant_type=password",
        {"email": email, "password": PASSWORD},
    )
    if status != 200:
        raise RuntimeError(f"Auth failed for {email}: {payload}")
    return payload["access_token"], payload["user"]["id"]


def main():
    for entry in LISTINGS:
        token, user_id = login(entry["email"])
        services = services_from_codes(entry["service_codes"])
        row = {
            "business_name": entry["business_name"],
            "services": services,
        }
        status, payload = request(
            "PATCH",
            f"/rest/v1/listings?user_id=eq.{user_id}",
            row,
            token=token,
            extra_headers={"Prefer": "return=representation"},
        )
        if status != 200:
            raise RuntimeError(f"Update failed for {entry['email']}: {payload}")
        listing = payload[0] if isinstance(payload, list) else payload
        print(f"[ok] {listing['business_name']}")
        print(f"     Services: {', '.join(listing['services'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())