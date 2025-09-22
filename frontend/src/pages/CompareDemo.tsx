"use client";
import React from 'react';
import { CostComparison } from "@/components/ui";
import { Button } from "@/components/ui/button";

const CompareDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Hero Section */}
      <div className="h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-5xl md:text-8xl font-bold text-gray-900 mb-6">
          Cost <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-700">Comparison</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl">
          See how Zopkit's unified business suite delivers exceptional value compared to multiple competitor subscriptions.
        </p>
        <Button
          size="lg"
          className="bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-700 hover:to-blue-800 text-white px-8 py-4 text-lg"
          onClick={() => {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
          }}
        >
          See the Savings
        </Button>
      </div>

      {/* Cost Comparison Section */}
      <div className="py-16">
        <CostComparison />
      </div>

      {/* Features Section */}
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-12 text-center">
          Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-700">Zopkit</span>?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl">
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">💰</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Massive Cost Savings</h3>
            <p className="text-gray-600">
              Pay $99/month for everything instead of $297/month for multiple separate tools. Save 67% on your business software costs.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🔧</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">One Unified Platform</h3>
            <p className="text-gray-600">
              No more switching between multiple applications. Everything you need is integrated into one seamless experience.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Faster Implementation</h3>
            <p className="text-gray-600">
              Get up and running 90% faster with our all-in-one solution. No complex integrations or data migrations required.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🔒</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Enhanced Security</h3>
            <p className="text-gray-600">
              Single security model instead of managing multiple vendor security. Unified permissions and access control.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Better Analytics</h3>
            <p className="text-gray-600">
              Comprehensive insights across all business functions. No data silos or complex reporting integrations needed.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🎯</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Simplified Management</h3>
            <p className="text-gray-600">
              One vendor relationship, one support team, one billing cycle. Dramatically reduced administrative overhead.
            </p>
          </div>
        </div>
      </div>

      {/* ROI Calculator Section */}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center px-4">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-12 text-center">
          Calculate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-700">ROI</span>
        </h2>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <p className="text-gray-600 mb-4">Annual savings with Zopkit</p>
            <div className="text-5xl font-bold text-green-600 mb-2">$2,376</div>
            <p className="text-gray-500">per year, per user</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Competitor Tools Cost</span>
              <span className="font-semibold text-gray-900">$297/month</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <span className="text-blue-700">Zopkit Cost</span>
              <span className="font-semibold text-blue-900">$99/month</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
              <span className="text-green-700">Monthly Savings</span>
              <span className="font-semibold text-green-900">$198/month</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="h-screen flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-700">Save 67%</span>?
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Join thousands of businesses who have switched to Zopkit and dramatically reduced their software costs while gaining a unified, powerful business platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            className="bg-gradient-to-r from-green-600 to-blue-700 hover:from-green-700 hover:to-blue-800 text-white px-8 py-4 text-lg"
          >
            Start Free Trial
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg"
          >
            Schedule Demo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareDemo;
