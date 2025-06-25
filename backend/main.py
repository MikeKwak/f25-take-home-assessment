from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import uvicorn
import requests
import uuid
import os
import json
import asyncio
from datetime import datetime
import google.generativeai as genai

# Try to load from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, continue without it

app = FastAPI(title="Weather Data System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for weather data
weather_storage: Dict[str, Dict[str, Any]] = {}

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

manager = ConnectionManager()

class WeatherRequest(BaseModel):
    date: str
    location: str
    notes: Optional[str] = ""

class WeatherResponse(BaseModel):
    id: str

class GeminiRequest(BaseModel):
    weather_id: str
    api_key: str

async def generate_weather_summary(weather_data: Dict[str, Any], api_key: str) -> str:
    """Generate weather summary using Gemini API"""
    try:
        # Configure the Gemini API
        genai.configure(api_key=api_key)
        
        # Get the model
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Prepare weather data for the prompt
        weather_info = weather_data.get("weather_data", {})
        location = weather_data.get("location", "")
        date = weather_data.get("date", "")
        notes = weather_data.get("notes", "")
        
        # Create a comprehensive prompt
        prompt = f"""
        Generate a concise, friendly weather summary for {location} on {date}.
        
        Weather conditions:
        - Temperature: {weather_info.get('temperature', 'N/A')}°F
        - Feels like: {weather_info.get('feels_like', 'N/A')}°F
        - Conditions: {weather_info.get('description', 'N/A')}
        - Humidity: {weather_info.get('humidity', 'N/A')}%
        - Wind: {weather_info.get('wind_speed', 'N/A')} mph {weather_info.get('wind_direction', '')} ({weather_info.get('wind_degree', 'N/A')}°)
        - Visibility: {weather_info.get('visibility', 'N/A')} miles
        - Pressure: {weather_info.get('pressure', 'N/A')} mb
        - UV Index: {weather_info.get('uv_index', 'N/A')}
        - Cloud Cover: {weather_info.get('cloudcover', 'N/A')}%
        - Precipitation: {weather_info.get('precip', 'N/A')} mm
        - Time of Day: {'Daytime' if weather_info.get('is_day') == 'yes' else 'Nighttime'}
        
        Location: {weather_info.get('location_name', 'N/A')}, {weather_info.get('region', 'N/A')}, {weather_info.get('country', 'N/A')}
        Coordinates: {weather_info.get('lat', 'N/A')}, {weather_info.get('lon', 'N/A')}
        Timezone: {weather_info.get('timezone', 'N/A')}
        
        User notes: {notes if notes else 'None provided'}
        
        Please provide a 3-4 sentence summary that's conversational and helpful for planning outdoor activities, including insights about the weather conditions and any notable factors.
        """
        
        # Generate content
        response = model.generate_content(prompt)
        
        if response.text:
            return response.text.strip()
        else:
            return "Unable to generate weather summary at this time."
        
    except Exception as e:
        raise Exception(f"Error generating summary: {str(e)}")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "generate_summary":
                weather_id = message.get("weather_id")
                api_key = message.get("api_key")
                
                if not api_key:
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "summary_error",
                            "error": "Gemini API key is required"
                        }),
                        websocket
                    )
                    continue
                
                if weather_id not in weather_storage:
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "summary_error",
                            "error": "Weather data not found"
                        }),
                        websocket
                    )
                    continue
                
                try:
                    weather_data = weather_storage[weather_id]
                    summary = await generate_weather_summary(weather_data, api_key)
                    
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "summary_result",
                            "summary": summary,
                            "weather_id": weather_id
                        }),
                        websocket
                    )
                except Exception as e:
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "summary_error",
                            "error": str(e)
                        }),
                        websocket
                    )
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/weather", response_model=WeatherResponse)
async def create_weather_request(request: WeatherRequest):
    """
    Handle weather request:
    1. Receive form data (date, location, notes)
    2. Call WeatherStack API for the location
    3. Store combined data with unique ID in memory
    4. Return the ID to frontend
    """
    try:
        # Get WeatherStack API key from environment variable
        api_key = os.getenv("WEATHERSTACK_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, 
                detail="WeatherStack API key not configured. Please set WEATHERSTACK_API_KEY environment variable or create a .env file in the backend directory."
            )
        
        # Call WeatherStack API
        weather_api_url = f"http://api.weatherstack.com/current"
        params = {
            "access_key": api_key,
            "query": request.location,
            "units": "f"  # Fahrenheit
        }
        
        response = requests.get(weather_api_url, params=params, timeout=10)
        response.raise_for_status()
        
        weather_data = response.json()
        
        # Check for API errors
        if "error" in weather_data:
            error_info = weather_data["error"]
            if error_info.get("code") == 615:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Location '{request.location}' not found. Please check the spelling and try again."
                )
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Weather API error: {error_info.get('info', 'Unknown error')}"
                )
        
        # Generate unique ID for this weather request
        weather_id = str(uuid.uuid4())
        
        # Store the combined data
        weather_storage[weather_id] = {
            "id": weather_id,
            "date": request.date,
            "location": request.location,
            "notes": request.notes,
            "weather_data": weather_data.get("current", {}),
            "location_info": weather_data.get("location", {}),
            "created_at": datetime.now().isoformat()
        }
        
        return WeatherResponse(id=weather_id)
        
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=408, 
            detail="Weather API request timed out. Please try again."
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error connecting to weather service: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error: {str(e)}"
        )

@app.get("/weather/{weather_id}")
async def get_weather_data(weather_id: str):
    """
    Retrieve stored weather data by ID.
    This endpoint is already implemented for the assessment.
    """
    if weather_id not in weather_storage:
        raise HTTPException(status_code=404, detail="Weather data not found")
    
    return weather_storage[weather_id]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)