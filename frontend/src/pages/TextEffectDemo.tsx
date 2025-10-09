"use client";
import React from 'react';
import { BusinessTextEffect } from "@/components/ui";
import { Button } from "@/components/ui/button";

const TextEffectDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Hero Section */}
      <div className="h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-5xl md:text-8xl font-bold text-gray-900 mb-6">
          Text <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-700">Animation</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl">
          Watch as text comes to life with smooth, professional animations that captivate your audience.
        </p>
        <Button
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white px-8 py-4 text-lg"
          onClick={() => {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
          }}
        >
          See the Effect
        </Button>
      </div>

      {/* Text Animation Section */}
      <div className="h-[200vh] flex items-center justify-center px-4">
        <div className="w-full max-w-5xl">
          <BusinessTextEffect />
        </div>
      </div>

      {/* Features Section */}
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-12 text-center">
          Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-700">Animated Text</span>?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl">
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Impact</h3>
            <p className="text-gray-600">
              Capture attention immediately with smooth text animations that draw the eye and engage viewers from the first word.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🎭</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Professional Polish</h3>
            <p className="text-gray-600">
              Add a layer of sophistication to your content with smooth, staggered word animations that feel premium and intentional.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">📈</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Better Retention</h3>
            <p className="text-gray-600">
              Studies show that animated content increases viewer retention by up to 80% compared to static text.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🎯</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Perfect Timing</h3>
            <p className="text-gray-600">
              Control the pace of information delivery with customizable animation delays and durations.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🌟</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Brand Impact</h3>
            <p className="text-gray-600">
              Make your brand message memorable with animated text that leaves a lasting impression on your audience.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">⚙️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Easy Integration</h3>
            <p className="text-gray-600">
              Drop-in component that works seamlessly with your existing design system and requires minimal setup.
            </p>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center px-4">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-12 text-center">
          Simple to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-700">Implement</span>
        </h2>

        <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Usage Example</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`import { BusinessTextEffect } from "@/components/ui";

export default function MyComponent() {
  return (
    <div className="w-full">
      <BusinessTextEffect />
    </div>
  );
}`}
          </pre>
        </div>
      </div>

      {/* CTA Section */}
      <div className="h-screen flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Ready to Bring Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-700">Text to Life</span>?
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Transform your static content into engaging, animated experiences that captivate your audience.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white px-8 py-4 text-lg"
          >
            Get Started
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg"
          >
            View Documentation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TextEffectDemo;
