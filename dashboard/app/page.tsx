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
    <div className="min-h-screen bg-gradient-to-br from-dpw-light to-gray-100 flex items-center justify-center py-12 px-4 sm:py-[70px] lg:py-[90px]">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl leading-[1.3em] font-serif font-bold text-dpw-dark mb-4">
          Dream Paris Wedding
        </h1>
        <h2 className="text-lg font-sans text-dpw-gold mb-8">
          AI Communication Assistant
        </h2>

        <p className="text-gray-700 font-sans text-base leading-loose mb-12 leading-relaxed">
          Intelligent message routing, AI-powered draft generation, and seamless
          team approval. Built for luxury wedding planning in Paris.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            href="/login"
            bgColor="bg-transparent"
            textColor="text-dpw-gold"
            border="border-dpw-gold border-2 rounded-lg"
            hover="hover:text-white hover:bg-dpw-gold"
            padding="px-8 py-3"
          >
            Sign In
          </Button>
           <Button
            href="/dashboard"
            bgColor="bg-transparent"
            textColor="text-dpw-gold"
            border="border-dpw-gold border-2 rounded-lg"
            hover="hover:text-white hover:bg-dpw-gold"
            padding="px-8 py-3"
          >
            View Demo
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 font-sans bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold text-xl mb-2">Fast Classification</h3>
            <p className="font-sans text-base text-gray-600">
              Auto-categorize incoming messages in seconds
            </p>
          </div>
          <div className="p-6 font-sans bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-2">✨</div>
            <h3 className="font-semibold text-xl mb-2">Smart Drafts</h3>
            <p className="font-sans text-base text-gray-600">
              AI generates contextual replies matching your voice
            </p>
          </div>
          <div className="p-6 font-sans bg-white rounded-lg shadow-sm">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="font-semibold text-xl mb-2">Team Approval</h3>
            <p className="font-sans text-base text-gray-600">
              Review and approve before messages go out
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
