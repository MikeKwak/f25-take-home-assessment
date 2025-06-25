"use client";

import { useState, useEffect } from "react";
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
import { Settings, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

interface ApiKeySidebarProps {
  onApiKeyChange: (apiKey: string) => void;
}

export function ApiKeySidebar({ onApiKeyChange }: ApiKeySidebarProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Load API key from localStorage on component mount
    const storedApiKey = localStorage.getItem("gemini_api_key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
      onApiKeyChange(storedApiKey);
      setIsValid(true);
    }
  }, [onApiKeyChange]);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setIsValid(null); // Reset validation state
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("gemini_api_key", apiKey.trim());
      onApiKeyChange(apiKey.trim());
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  };

  const handleClearApiKey = () => {
    setApiKey("");
    localStorage.removeItem("gemini_api_key");
    onApiKeyChange("");
    setIsValid(null);
  };

  const validateApiKey = (key: string) => {
    // Basic validation for Gemini API key format
    return key.trim().length > 0 && key.includes("AIza");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Gemini API Settings
        </CardTitle>
        <CardDescription>
          Add your Gemini API key to enable AI weather summaries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Validation indicator */}
          {apiKey && (
            <div className="flex items-center gap-2 text-sm">
              {validateApiKey(apiKey) ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Valid API key format</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-600">Invalid API key format</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSaveApiKey} className="flex-1">
            Save API Key
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearApiKey}
            disabled={!apiKey}
          >
            Clear
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Get your API key from Google AI Studio</p>
          <p>• Your API key is stored locally in your browser</p>
          <p>• Never share your API key publicly</p>
        </div>
      </CardContent>
    </Card>
  );
} 