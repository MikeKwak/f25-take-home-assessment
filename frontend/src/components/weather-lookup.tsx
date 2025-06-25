"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Thermometer, Wind, Eye, MapPin, Calendar, FileText, Clock, Sparkles, Loader2, AlertCircle } from "lucide-react";

interface WeatherData {
  id: string;
  date: string;
  location: string;
  notes: string;
  weather_data: {
    temperature?: number;
    feels_like?: number;
    description?: string;
    humidity?: number;
    wind_speed?: number;
    wind_direction?: string;
    pressure?: number;
    visibility?: number;
    uv_index?: number;
    location_name?: string;
    region?: string;
    country?: string;
    timezone?: string;
    cloudcover?: number;
    precip?: number;
    weather_icons?: string[];
    observation_time?: string;
    is_day?: string;
    wind_degree?: number;
    lat?: number;
    lon?: number;
    localtime?: string;
    utc_offset?: string;
  };
  created_at: string;
}

interface WeatherLookupProps {
  geminiApiKey: string;
}

export function WeatherLookup({ geminiApiKey }: WeatherLookupProps) {
  const [weatherId, setWeatherId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load last submitted ID from localStorage on component mount
  useEffect(() => {
    const storedId = localStorage.getItem("lastSubmittedWeatherId");
    if (storedId) {
      setLastSubmittedId(storedId);
    }
  }, []);

  // Listen for storage changes to update the last submitted ID
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "lastSubmittedWeatherId" && e.newValue) {
        setLastSubmittedId(e.newValue);
      }
    };

    // Listen for custom event for same-tab updates
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail?.key === "lastSubmittedWeatherId") {
        setLastSubmittedId(e.detail.value);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomStorageChange as EventListener);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomStorageChange as EventListener);
    };
  }, []);

  // WebSocket connection management with reconnection logic
  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        console.log("Attempting to connect to WebSocket...");
        wsRef.current = new WebSocket("ws://localhost:8000/ws");

        wsRef.current.onopen = () => {
          console.log("WebSocket connected successfully");
          setWsConnected(true);
          setSummaryError(null);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("WebSocket message received:", data);
            
            if (data.type === "summary_result") {
              setAiSummary(data.summary);
              setIsGeneratingSummary(false);
              setSummaryError(null);
            } else if (data.type === "summary_error") {
              setSummaryError(data.error);
              setIsGeneratingSummary(false);
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error("WebSocket error:", error);
          setWsConnected(false);
          setSummaryError("Failed to connect to AI service");
          setIsGeneratingSummary(false);
        };

        wsRef.current.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          setWsConnected(false);
          
          // Attempt to reconnect after 3 seconds if not a normal closure
          if (event.code !== 1000) {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log("Attempting to reconnect WebSocket...");
              connectWebSocket();
            }, 3000);
          }
        };
      } catch (error) {
        console.error("Error creating WebSocket connection:", error);
        setWsConnected(false);
        setSummaryError("Failed to create WebSocket connection");
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weatherId.trim()) return;

    setIsLoading(true);
    setError(null);
    setWeatherData(null);
    setAiSummary(null);
    setSummaryError(null);

    try {
      const response = await fetch(`http://localhost:8000/weather/${weatherId.trim()}`);
      
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Weather data not found");
      }
    } catch {
      setError("Network error: Could not connect to the server");
    } finally {
      setIsLoading(false);
    }
  };

  const generateAiSummary = () => {
    if (!weatherData || !geminiApiKey) {
      setSummaryError("Weather data or API key not available");
      return;
    }

    if (!wsConnected || wsRef.current?.readyState !== WebSocket.OPEN) {
      setSummaryError("AI service not connected. Please wait for connection or refresh the page.");
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryError(null);

    try {
      const message = {
        type: "generate_summary",
        weather_id: weatherData.id,
        api_key: geminiApiKey
      };
      
      console.log("Sending WebSocket message:", message);
      wsRef.current.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
      setSummaryError("Failed to send request to AI service");
      setIsGeneratingSummary(false);
    }
  };

  const insertLastSubmittedId = () => {
    if (lastSubmittedId) {
      setWeatherId(lastSubmittedId);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Weather Data Lookup
        </CardTitle>
        <CardDescription>
          Enter a weather ID to retrieve stored weather information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weatherId">Weather ID</Label>
            <div className="flex gap-2">
              <Input
                id="weatherId"
                value={weatherId}
                onChange={(e) => setWeatherId(e.target.value)}
                placeholder="Enter weather ID..."
                className="input-enhanced"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !weatherId.trim()}
                className="btn-enhanced"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Last Submitted ID Button */}
          {lastSubmittedId && (
            <Button
              type="button"
              variant="outline"
              onClick={insertLastSubmittedId}
              className="w-full btn-enhanced"
            >
              Use Last Submitted ID: {lastSubmittedId.substring(0, 8)}...
            </Button>
          )}
        </form>

        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Weather Data Display */}
        {weatherData && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Date</span>
                </div>
                <p className="font-medium">{formatDate(weatherData.date)}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Location</span>
                </div>
                <p className="font-medium">{weatherData.location}</p>
              </div>
            </div>

            {/* Weather Conditions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Thermometer className="w-5 h-5" />
                Current Conditions
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-2xl font-bold text-primary">
                    {weatherData.weather_data.temperature}°F
                  </div>
                  <div className="text-sm text-muted-foreground">Temperature</div>
                </div>
                
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-600">
                    {weatherData.weather_data.humidity}%
                  </div>
                  <div className="text-sm text-muted-foreground">Humidity</div>
                </div>
                
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-600">
                    {weatherData.weather_data.wind_speed} mph
                  </div>
                  <div className="text-sm text-muted-foreground">Wind Speed</div>
                </div>
                
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-600">
                    {weatherData.weather_data.visibility} mi
                  </div>
                  <div className="text-sm text-muted-foreground">Visibility</div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-lg font-medium mb-2">
                  {weatherData.weather_data.description}
                </div>
                <div className="text-sm text-muted-foreground">
                  Feels like {weatherData.weather_data.feels_like}°F
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wind className="w-5 h-5" />
                Additional Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pressure</span>
                    <span className="font-medium">{weatherData.weather_data.pressure} mb</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">UV Index</span>
                    <span className="font-medium">{weatherData.weather_data.uv_index}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cloud Cover</span>
                    <span className="font-medium">{weatherData.weather_data.cloudcover}%</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Precipitation</span>
                    <span className="font-medium">{weatherData.weather_data.precip} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Wind Direction</span>
                    <span className="font-medium">{weatherData.weather_data.wind_direction} ({weatherData.weather_data.wind_degree}°)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Time of Day</span>
                    <span className="font-medium">{weatherData.weather_data.is_day === 'yes' ? 'Daytime' : 'Nighttime'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Info */}
            {weatherData.weather_data.location_name && (
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location Details
                </h4>
                <div className="text-sm text-muted-foreground">
                  {weatherData.weather_data.location_name}, {weatherData.weather_data.region}, {weatherData.weather_data.country}
                </div>
                <div className="text-sm text-muted-foreground">
                  Coordinates: {weatherData.weather_data.lat}, {weatherData.weather_data.lon}
                </div>
                <div className="text-sm text-muted-foreground">
                  Timezone: {weatherData.weather_data.timezone}
                </div>
              </div>
            )}

            {/* Notes */}
            {weatherData.notes && (
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </h4>
                <p className="text-sm text-muted-foreground">{weatherData.notes}</p>
              </div>
            )}

            {/* Created At */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Created: {formatDate(weatherData.created_at)} at {formatTime(weatherData.created_at)}</span>
              </div>
            </div>

            {/* AI Summary Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Summary
                </h3>
                <Button
                  onClick={generateAiSummary}
                  disabled={isGeneratingSummary || !geminiApiKey}
                  className="btn-enhanced"
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Summary
                    </>
                  )}
                </Button>
              </div>

              {summaryError && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">{summaryError}</span>
                  </div>
                </div>
              )}

              {aiSummary && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-medium text-primary">AI Summary</span>
                  </div>
                  <p className="text-sm leading-relaxed">{aiSummary}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 