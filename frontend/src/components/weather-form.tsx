"use client";

import { useState } from "react";
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
import { CalendarIcon, Copy, Check, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "./ui/textarea";

interface WeatherFormData {
  date: string;
  location: string;
  notes: string;
}

function formatDateForDisplay(date: Date | undefined): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateForAPI(date: Date | undefined): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

function isValidDate(date: Date | undefined): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function WeatherForm() {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(
    new Date(),
  );
  const [displayValue, setDisplayValue] = useState(
    formatDateForDisplay(new Date()),
  );

  const [formData, setFormData] = useState<WeatherFormData>({
    date: formatDateForAPI(new Date()),
    location: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    id?: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setDisplayValue(formatDateForDisplay(date));
    setFormData((prev) => ({
      ...prev,
      date: formatDateForAPI(date),
    }));
    setCalendarOpen(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    const parsedDate = new Date(inputValue);
    if (isValidDate(parsedDate)) {
      setSelectedDate(parsedDate);
      setCalendarMonth(parsedDate);
      setFormData((prev) => ({
        ...prev,
        date: formatDateForAPI(parsedDate),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/weather", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setResult({
          success: true,
          message: "Weather request submitted successfully!",
          id: data.id,
        });
        
        if (data.id) {
          localStorage.setItem("lastSubmittedWeatherId", data.id);
          // Dispatch custom event for same-tab communication
          window.dispatchEvent(new CustomEvent("localStorageChange", {
            detail: { key: "lastSubmittedWeatherId", value: data.id }
          }));
        }
        
        const today = new Date();
        setSelectedDate(today);
        setDisplayValue(formatDateForDisplay(today));
        setFormData({
          date: formatDateForAPI(today),
          location: "",
          notes: "",
        });
      } else {
        const errorData = await response.json();
        setResult({
          success: false,
          message: errorData.detail || "Failed to submit weather request",
        });
      }
    } catch {
      setResult({
        success: false,
        message: "Network error: Could not connect to the server",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <Card className="w-full card-hover border-0 shadow-lg bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarIcon className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold">Weather Data Request</CardTitle>
        </div>
        <CardDescription className="text-base leading-relaxed">
          Submit a weather data request for a specific location and date. 
          Our system will process and store your weather information securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="date" className="text-sm font-medium px-1">
              Date
            </Label>
            <div className="relative">
              <Input
                id="date"
                value={displayValue}
                placeholder="Select a date"
                className="input-enhanced bg-background/50 pr-10 h-12"
                onChange={handleDateInputChange}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCalendarOpen(true);
                  }
                }}
                required
              />
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute top-1/2 right-2 size-6 -translate-y-1/2 hover:bg-muted/50"
                  >
                    <CalendarIcon className="size-3.5" />
                    <span className="sr-only">Select date</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="end"
                  alignOffset={-8}
                  sideOffset={10}
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4">
            <Label htmlFor="location" className="text-sm font-medium px-1">
              Location
            </Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Enter city, state, or country"
              className="input-enhanced h-12 bg-background/50"
              required
            />
          </div>

          <div className="space-y-4">
            <Label htmlFor="notes" className="text-sm font-medium px-1">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add any additional notes about your weather request..."
              className="input-enhanced min-h-[100px] bg-background/50 resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 btn-enhanced"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Weather Request"
            )}
          </Button>
        </form>

        {/* Result Display */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
              : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="p-1 rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  result.success 
                    ? "text-green-800 dark:text-green-200" 
                    : "text-red-800 dark:text-red-200"
                }`}>
                  {result.message}
                </p>
                {result.success && result.id && (
                  <div className="mt-3 p-3 rounded-lg bg-background/50 border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Weather ID:
                        </p>
                        <p className="font-mono text-sm break-all">{result.id}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyId(result.id!)}
                        className="ml-3 btn-enhanced"
                      >
                        {copiedId ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Use this ID to retrieve your weather data later
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
