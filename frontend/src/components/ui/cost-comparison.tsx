"use client";
import { Compare } from "@/components/ui/compare";
import { CheckCircle, Star } from "lucide-react";

const CostComparison = () => {
  return (
    <div className="w-full max-w-6xl mx-auto p-8 bg-white rounded-2xl shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Zopkit vs Competitors
        </h2>
        <p className="text-xl text-gray-600">
          See why Zopkit offers the best value for your business
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Feature Comparison */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Feature Comparison</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="font-semibold text-gray-800">CRM Integration</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-semibold">Included</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="font-semibold text-gray-800">HRMS Module</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-semibold">Included</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="font-semibold text-gray-800">Project Management</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-semibold">Included</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="font-semibold text-gray-800">Operations Management</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-semibold">Included</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <span className="font-semibold text-gray-800">Finance Management</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-semibold">Included</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl text-center">
              <h4 className="text-lg font-bold mb-2">Zopkit</h4>
              <div className="text-3xl font-bold mb-1">$99</div>
              <div className="text-sm opacity-90">/month</div>
              <div className="flex items-center justify-center mt-3">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="ml-1 text-sm">Best Value</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-600 to-gray-800 text-white p-6 rounded-xl text-center">
              <h4 className="text-lg font-bold mb-2">Competitors</h4>
              <div className="text-2xl font-bold mb-1">$297</div>
              <div className="text-sm opacity-90">/month</div>
              <div className="text-xs opacity-75 mt-3">Multiple subscriptions</div>
            </div>
          </div>
        </div>

        {/* Right Side - Interactive Comparison */}
        <div className="flex flex-col items-center">
          <Compare
            firstImage="/zopkit-logo-comparison.svg"
            secondImage="/competitor-logos-comparison.svg"
            firstImageClassName="object-contain object-center p-8"
            secondImageClassname="object-contain object-center p-8"
            className="h-[400px] w-[400px] rounded-2xl bg-white"
            slideMode="hover"
            showHandlebar={true}
          />

          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">
              <strong>Slide to compare:</strong> Zopkit's unified platform vs multiple competitor subscriptions
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-green-600 rounded"></div>
                <span>Zopkit ($99/month)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-gray-500 to-gray-700 rounded"></div>
                <span>Competitors ($297/month)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Detailed Comparison */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
          <h4 className="text-xl font-bold text-blue-900 mb-3">Cost Savings</h4>
          <p className="text-3xl font-bold text-blue-600 mb-2">67%</p>
          <p className="text-blue-700">Lower total cost compared to competitors</p>
        </div>

        <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
          <h4 className="text-xl font-bold text-green-900 mb-3">Setup Time</h4>
          <p className="text-3xl font-bold text-green-600 mb-2">90%</p>
          <p className="text-green-700">Faster implementation and onboarding</p>
        </div>

        <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
          <h4 className="text-xl font-bold text-purple-900 mb-3">Maintenance</h4>
          <p className="text-3xl font-bold text-purple-600 mb-2">75%</p>
          <p className="text-purple-700">Less time spent on system maintenance</p>
        </div>
      </div>
    </div>
  );
};

export default CostComparison;
