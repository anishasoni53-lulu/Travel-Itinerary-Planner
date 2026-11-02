import json
import os
import uuid
from datetime import datetime, date
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="AI TripMate API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional integrations. The app still works in demo mode if keys are not configured.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

try:
    from google import genai
    GEMINI_AVAILABLE = bool(GEMINI_API_KEY)
except ImportError:
    genai = None
    GEMINI_AVAILABLE = False

try:
    from supabase import create_client
    SUPABASE_AVAILABLE = bool(SUPABASE_URL and SUPABASE_KEY)
except ImportError:
    create_client = None
    SUPABASE_AVAILABLE = False

supabase_client = None
if SUPABASE_AVAILABLE:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        supabase_client = None

# In-memory fallback is useful for a local demo, but data disappears when the API restarts.
DEMO_TRIPS = []


class TripRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=100)
    start_date: Optional[str] = None
    days: int = Field(default=3, ge=1, le=14)
    budget: float = Field(default=10000, gt=0, le=10000000)
    currency: str = "INR"
    interests: list[str] = Field(default_factory=lambda: ["sightseeing"])
    travel_style: str = "balanced"
    group_size: int = Field(default=1, ge=1, le=30)


class SaveTripRequest(BaseModel):
    trip: dict


def demo_itinerary(req: TripRequest) -> dict:
    interests = ", ".join(req.interests) if req.interests else "general sightseeing"
    per_day = round(req.budget / req.days)
    days = []
    for i in range(1, req.days + 1):
        days.append({
            "day": i,
            "title": ["Explore the highlights", "Local experiences", "A relaxed final day"][min(i - 1, 2)],
            "activities": [
                {"time": "09:00", "name": f"Breakfast near your stay in {req.destination}", "type": "Dining", "estimated_cost": round(per_day * 0.15)},
                {"time": "10:30", "name": f"Visit a popular local attraction in {req.destination}", "type": "Sightseeing", "estimated_cost": round(per_day * 0.35)},
                {"time": "13:00", "name": "Lunch at a well-reviewed local restaurant", "type": "Dining", "estimated_cost": round(per_day * 0.20)},
                {"time": "15:00", "name": f"Explore {interests} experiences", "type": "Experience", "estimated_cost": round(per_day * 0.20)},
                {"time": "18:00", "name": "Evening walk and dinner", "type": "Leisure", "estimated_cost": round(per_day * 0.10)},
            ],
            "transport_tip": "Group nearby stops together and check current local transit options before leaving.",
        })
    return {
        "destination": req.destination,
        "days": days,
        "budget_breakdown": {
            "accommodation": round(req.budget * 0.35),
            "food": round(req.budget * 0.25),
            "activities": round(req.budget * 0.25),
            "transport": round(req.budget * 0.15),
            "total_estimate": round(req.budget),
            "currency": req.currency,
        },
        "travel_tips": [
            "This is a demo itinerary with illustrative estimates, not live-verified prices.",
            "Confirm opening hours, ticket prices, transport schedules, and accommodation availability before travelling.",
            f"The plan is tailored around: {interests} and a {req.travel_style} travel style.",
        ],
        "mode": "demo",
    }


def generate_with_gemini(req: TripRequest) -> dict:
    client = genai.Client(api_key=GEMINI_API_KEY)
    prompt = f'''You are a careful travel-planning assistant. Create a practical itinerary using this input:
Destination: {req.destination}
Start date: {req.start_date or 'not specified'}
Number of days: {req.days}
Total budget: {req.currency} {req.budget} for the whole group
Group size: {req.group_size}
Interests: {', '.join(req.interests) if req.interests else 'general sightseeing'}
Travel style: {req.travel_style}

Return ONLY valid JSON with this exact shape:
{{"destination":"string","days":[{{"day":1,"title":"string","activities":[{{"time":"09:00","name":"string","type":"Dining or Sightseeing or Experience or Leisure or Transport","estimated_cost":0}}],"transport_tip":"string"}}],"budget_breakdown":{{"accommodation":0,"food":0,"activities":0,"transport":0,"total_estimate":0,"currency":"{req.currency}"}},"travel_tips":["string"]}}
Make exactly {req.days} day entries. Keep total estimates within the budget when feasible. Use approximate costs and do not claim live availability or verified opening hours. Avoid inventing exact booking details. If the destination is ambiguous, state assumptions in travel_tips. Costs must be numeric. Use {req.currency} for all estimates.'''
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "max_output_tokens": 3000,
        },
    )
    text = (response.text or "").strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    data = json.loads(text.strip())
    data["mode"] = "gemini"
    return data


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ai_configured": GEMINI_AVAILABLE,
        "supabase_configured": supabase_client is not None,
        "model": GEMINI_MODEL if GEMINI_AVAILABLE else None,
    }


@app.post("/api/generate")
def generate_itinerary(req: TripRequest):
    if GEMINI_AVAILABLE:
        try:
            return generate_with_gemini(req)
        except  Exception as exc:
            print("GEMINI ERROR:", repr(exc))
            # Keep the demo usable if the API key/model/network has a problem.
            result = demo_itinerary(req)
            result["warning"] = f"AI generation failed; showing demo itinerary instead. Details: {type(exc).__name__}"
            return result
    return demo_itinerary(req)


@app.post("/api/trips")
def save_trip(payload: SaveTripRequest):
    trip = payload.trip
    trip_id = str(uuid.uuid4())
    record = {
        "id": trip_id,
        "destination": str(trip.get("destination", "Untitled trip")),
        "trip_data": trip,
        "created_at": datetime.utcnow().isoformat(),
    }
    if supabase_client is not None:
        try:
            result = supabase_client.table("trips").insert({
                "id": trip_id,
                "destination": record["destination"],
                "trip_data": trip,
            }).execute()
            rows = getattr(result, "data", None) or []
            if rows:
                return {"saved": True, "storage": "supabase", "trip": rows[0]}
            return {"saved": True, "storage": "supabase", "trip": record}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Supabase save failed: {type(exc).__name__}. Check your table and backend environment variables.")
    DEMO_TRIPS.insert(0, record)
    return {"saved": True, "storage": "memory-demo", "trip": record, "note": "Configure Supabase for persistent storage. Demo saves disappear when the backend restarts."}


@app.get("/api/trips")
def list_trips():
    if supabase_client is not None:
        try:
            result = supabase_client.table("trips").select("*").order("created_at", desc=True).limit(50).execute()
            return {"storage": "supabase", "trips": getattr(result, "data", None) or []}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Supabase read failed: {type(exc).__name__}. Check your table and backend environment variables.")
    return {"storage": "memory-demo", "trips": DEMO_TRIPS}
