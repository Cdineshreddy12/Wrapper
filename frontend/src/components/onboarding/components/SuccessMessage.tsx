import React, { useEffect, useState } from 'react';



export const SuccessMessage: React.FC = () => {
    const [mounted, setMounted] = useState(false);
    const [confettiVisible, setConfettiVisible] = useState(false);

    useEffect(() => {
        setMounted(true);
        setTimeout(() => setConfettiVisible(true), 300);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 relative overflow-hidden">
            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-yellow-400 to-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-green-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            {/* Floating particles */}
            {confettiVisible && (
                <div className="absolute inset-0">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className={`absolute w-2 h-2 rounded-full animate-float-${i % 4 + 1} opacity-80`}
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                backgroundColor: [
                                    '#10B981', '#3B82F6', '#F59E0B', '#EF4444',
                                    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
                                ][i % 8],
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${3 + Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Glassmorphism card */}
            <div className={`relative z-10 backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-12 max-w-lg text-center shadow-2xl transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>

                {/* Success icon with enhanced animations */}
                <div className="relative mb-8 flex justify-center">
                    <div className={`relative transform transition-all duration-1000 ${mounted ? 'scale-100 rotate-0' : 'scale-0 rotate-180'}`}>
                        {/* Outer glow rings */}
                        <div className="absolute inset-0 w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-ping opacity-20"></div>
                        <div className="absolute inset-0 w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse opacity-30"></div>

                        {/* Main icon container */}
                        <div className="relative w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
                            <svg
                                className="w-16 h-16 text-white animate-bounce"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                style={{ animationDelay: '0.5s', animationDuration: '2s' }}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>

                            {/* Sparkle effects */}
                            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '0.8s' }}></div>
                        </div>
                    </div>
                </div>

                {/* Enhanced title with gradient text */}
                <h1 className={`text-5xl font-black bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-6 transform transition-all duration-1000 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    Success!
                </h1>

                {/* Subtitle */}
                <h2 className={`text-xl font-semibold text-white/90 mb-4 transform transition-all duration-1000 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    Organization Created Successfully
                </h2>

                {/* Description with better typography */}
                <p className={`text-white/80 text-lg leading-relaxed mb-10 transform transition-all duration-1000 delay-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    🎉 Your  organization is now live and ready for action!
                    <br />
                    <span className="text-purple-300">Time to make magic happen</span> ✨
                </p>

                {/* Enhanced buttons */}
                <div className={`space-y-4 transform transition-all duration-1000 delay-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <button
                        // onClick={onReset}
                        className="group relative w-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 active:scale-95 overflow-hidden"
                    >
                        {/* Button shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        <span className="relative flex items-center justify-center gap-2">
                            <span>                            Go to Dashboard
                            </span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </span>
                    </button>


                </div>

                {/* Status indicator */}
                <div className={`mt-8 flex items-center justify-center gap-2 text-green-300 text-sm font-medium transform transition-all duration-1000 delay-1200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Organization Status: Active & Ready</span>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
            </div>

            {/* Custom animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
          @keyframes blob {
            0%, 100% {
              transform: translate(0px, 0px) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
          }
          
          @keyframes float-1 {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0; }
            50% { transform: translateY(-100px) rotate(180deg); opacity: 1; }
          }
          
          @keyframes float-2 {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0; }
            50% { transform: translateY(-120px) rotate(-180deg); opacity: 1; }
          }
          
          @keyframes float-3 {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0; }
            50% { transform: translateY(-80px) rotate(360deg); opacity: 1; }
          }
          
          @keyframes float-4 {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0; }
            50% { transform: translateY(-110px) rotate(-360deg); opacity: 1; }
          }
          
          .animate-blob {
            animation: blob 7s infinite;
          }
          
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          
          .animation-delay-4000 {
            animation-delay: 4s;
          }
          
          .animate-float-1 {
            animation: float-1 4s ease-in-out infinite;
          }
          
          .animate-float-2 {
            animation: float-2 4s ease-in-out infinite;
          }
          
          .animate-float-3 {
            animation: float-3 4s ease-in-out infinite;
          }
          
          .animate-float-4 {
            animation: float-4 4s ease-in-out infinite;
          }
        `
            }} />
        </div>
    );
};