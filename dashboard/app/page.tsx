"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/UI/Button";

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dpw-light to-gray-100 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-dpw-dark mb-4">
          Dream Paris Wedding
        </h1>
        <h2 className="text-2xl text-dpw-gold mb-8">
          AI Communication Assistant
        </h2>

        <p className="text-gray-700 text-lg mb-12 leading-relaxed">
          Intelligent message routing, AI-powered draft generation, and seamless
          team approval. Built for luxury wedding planning in Paris.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            href="/login"
            bgColor="bg-dpw-gold"
            textColor="text-white"
            border="border-dpw-gold border-2 rounded-lg"
            hover="hover:text-white"
            padding="px-8 py-3"
          >
            Sign In
          </Button>
          <Link
            href="/dashboard"
            className="px-8 py-3 border-2 border-dpw-gold text-dpw-gold font-semibold rounded-lg hover:bg-dpw-gold hover:text-white transition-all"
          >
            View Demo
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold text-lg mb-2">Fast Classification</h3>
            <p className="text-gray-600">
              Auto-categorize incoming messages in seconds
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-2">✨</div>
            <h3 className="font-semibold text-lg mb-2">Smart Drafts</h3>
            <p className="text-gray-600">
              AI generates contextual replies matching your voice
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="font-semibold text-lg mb-2">Team Approval</h3>
            <p className="text-gray-600">
              Review and approve before messages go out
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
