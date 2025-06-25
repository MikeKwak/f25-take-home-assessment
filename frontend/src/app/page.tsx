"use client";

import { useState } from "react";
import { WeatherForm } from "@/components/weather-form";
import { WeatherLookup } from "@/components/weather-lookup";
import { FoldableSidebar } from "@/components/foldable-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Cloud, Sun, Wind } from "lucide-react";

export default function Home() {
  const [geminiApiKey, setGeminiApiKey] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <Cloud className="w-8 h-8 text-primary" />
            </div>
            <div className="p-3 rounded-full bg-yellow-500/10 border border-yellow-500/20">
              <Sun className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="p-3 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Wind className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Weather Data System
          </h1>
          <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto leading-relaxed">
            Store and retrieve weather information with AI-powered summaries. 
            Get detailed insights and intelligent analysis of weather patterns.
          </p>
        </div>

        {/* Main Content - Enhanced Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
          <div className="space-y-6">
            <WeatherForm />
          </div>
          <div className="space-y-6">
            <WeatherLookup geminiApiKey={geminiApiKey} />
          </div>
        </div>

        {/* Foldable Sidebar */}
        <FoldableSidebar onApiKeyChange={setGeminiApiKey} />
      </div>
    </div>
  );
}
