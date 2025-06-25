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
import { Settings, Eye, EyeOff, CheckCircle, AlertCircle, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface FoldableSidebarProps {
  onApiKeyChange: (apiKey: string) => void;
}

export function FoldableSidebar({ onApiKeyChange }: FoldableSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    <>
      {/* Theme Toggle and Settings Buttons - Side by Side */}
      <div className="fixed top-6 right-6 z-50 flex gap-2">
        <ThemeToggle />
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="icon"
          className="shadow-lg btn-enhanced bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Enhanced Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-background/95 backdrop-blur-md border-l border-border/50 shadow-2xl z-50 transform transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <Card className="h-full rounded-none border-0 bg-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                API Settings
              </CardTitle>
              <CardDescription className="mt-2">
                Configure your Gemini API key for AI-powered summaries
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="hover:bg-muted/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="apiKey" className="text-sm font-medium">Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="input-enhanced pr-10 h-12 bg-background/50"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-muted/50"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {/* Enhanced Validation indicator */}
              {apiKey && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-background/50">
                  {validateApiKey(apiKey) ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 font-medium">Valid API key format</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-600 font-medium">Invalid API key format</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSaveApiKey} className="flex-1 h-12 btn-enhanced">
                Save API Key
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClearApiKey}
                disabled={!apiKey}
                className="h-12 btn-enhanced"
              >
                Clear
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Getting Started:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Get your API key from Google AI Studio</li>
                <li>• Your API key is stored locally in your browser</li>
                <li>• Never share your API key publicly</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 