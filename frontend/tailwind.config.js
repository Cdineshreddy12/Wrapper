/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				'50': '#eff6ff',
  				'100': '#dbeafe',
  				'200': '#bfdbfe',
  				'300': '#93c5fd',
  				'400': '#60a5fa',
  				'500': '#3b82f6',
  				'600': '#2563eb',
  				'700': '#1d4ed8',
  				'800': '#1e40af',
  				'900': '#1e3a8a',
  				'950': '#172554',
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			gray: {
  				'50': '#f9fafb',
  				'100': '#f3f4f6',
  				'200': '#e5e7eb',
  				'300': '#d1d5db',
  				'400': '#9ca3af',
  				'500': '#6b7280',
  				'600': '#4b5563',
  				'700': '#374151',
  				'800': '#1f2937',
  				'900': '#111827',
  				'950': '#030712'
  			},
  			success: {
  				'50': '#f0fdf4',
  				'100': '#dcfce7',
  				'200': '#bbf7d0',
  				'300': '#86efac',
  				'400': '#4ade80',
  				'500': '#22c55e',
  				'600': '#16a34a',
  				'700': '#15803d',
  				'800': '#166534',
  				'900': '#14532d'
  			},
  			warning: {
  				'50': '#fffbeb',
  				'100': '#fef3c7',
  				'200': '#fde68a',
  				'300': '#fcd34d',
  				'400': '#fbbf24',
  				'500': '#f59e0b',
  				'600': '#d97706',
  				'700': '#b45309',
  				'800': '#92400e',
  				'900': '#78350f'
  			},
  			error: {
  				'50': '#fef2f2',
  				'100': '#fee2e2',
  				'200': '#fecaca',
  				'300': '#fca5a5',
  				'400': '#f87171',
  				'500': '#ef4444',
  				'600': '#dc2626',
  				'700': '#b91c1c',
  				'800': '#991b1b',
  				'900': '#7f1d1d'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
		fontFamily: {
			sans: [
				'Inter',
				'system-ui',
				'sans-serif'
			],
			mono: [
				'JetBrains Mono',
				'Menlo',
				'Monaco',
				'monospace'
			]
		},
		fontSize: {
			'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
			'sm': ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
			'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px
			'lg': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
			'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
			'2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px
			'3xl': ['1.875rem', { lineHeight: '2.25rem' }],  // 30px
			'4xl': ['2.25rem', { lineHeight: '2.5rem' }],    // 36px
			'5xl': ['3rem', { lineHeight: '1' }],            // 48px
			'6xl': ['3.75rem', { lineHeight: '1' }],         // 60px
			'7xl': ['4.5rem', { lineHeight: '1' }],          // 72px
			'8xl': ['6rem', { lineHeight: '1' }],            // 96px
			'9xl': ['8rem', { lineHeight: '1' }]             // 128px
		},
		fontWeight: {
			thin: '100',
			extralight: '200',
			light: '300',
			normal: '400',
			medium: '500',
			semibold: '600',
			bold: '700',
			extrabold: '800',
			black: '900'
		},
		letterSpacing: {
			tighter: '-0.05em',
			tight: '-0.025em',
			normal: '0em',
			wide: '0.025em',
			wider: '0.05em',
			widest: '0.1em'
		},
  		animation: {
  			'fade-in': 'fadeIn 0.5s ease-in-out',
  			'fade-out': 'fadeOut 0.3s ease-in-out',
  			'slide-in': 'slideIn 0.3s ease-out',
  			'slide-out': 'slideOut 0.3s ease-in',
  			'slide-up': 'slideUp 0.3s ease-out',
  			'slide-down': 'slideDown 0.3s ease-out',
  			'scale-in': 'scaleIn 0.2s ease-out',
  			'scale-out': 'scaleOut 0.2s ease-in',
  			'bounce-subtle': 'bounceSubtle 2s infinite',
  			'pulse-slow': 'pulse 3s infinite',
  			'spin-slow': 'spin 3s linear infinite',
  			'wiggle': 'wiggle 1s ease-in-out infinite',
  			'float': 'float 3s ease-in-out infinite',
  			'shimmer': 'shimmer 2s linear infinite',
  			'gradient-x': 'gradient-x 15s ease infinite',
  			'gradient-y': 'gradient-y 15s ease infinite',
  			'gradient-xy': 'gradient-xy 15s ease infinite'
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' }
  			},
  			fadeOut: {
  				'0%': { opacity: '1' },
  				'100%': { opacity: '0' }
  			},
  			slideIn: {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(0)' }
  			},
  			slideOut: {
  				'0%': { transform: 'translateX(0)' },
  				'100%': { transform: 'translateX(-100%)' }
  			},
  			slideUp: {
  				'0%': { transform: 'translateY(100%)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' }
  			},
  			slideDown: {
  				'0%': { transform: 'translateY(-100%)', opacity: '0' },
  				'100%': { transform: 'translateY(0)', opacity: '1' }
  			},
  			scaleIn: {
  				'0%': { transform: 'scale(0.95)', opacity: '0' },
  				'100%': { transform: 'scale(1)', opacity: '1' }
  			},
  			scaleOut: {
  				'0%': { transform: 'scale(1)', opacity: '1' },
  				'100%': { transform: 'scale(0.95)', opacity: '0' }
  			},
  			bounceSubtle: {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-5px)' }
  			},
  			wiggle: {
  				'0%, 100%': { transform: 'rotate(-3deg)' },
  				'50%': { transform: 'rotate(3deg)' }
  			},
  			float: {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-10px)' }
  			},
  			shimmer: {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			},
  			'gradient-x': {
  				'0%, 100%': { backgroundPosition: '0% 50%' },
  				'50%': { backgroundPosition: '100% 50%' }
  			},
  			'gradient-y': {
  				'0%, 100%': { backgroundPosition: '50% 0%' },
  				'50%': { backgroundPosition: '50% 100%' }
  			},
  			'gradient-xy': {
  				'0%, 100%': { backgroundPosition: '0% 50%' },
  				'25%': { backgroundPosition: '100% 50%' },
  				'50%': { backgroundPosition: '100% 100%' },
  				'75%': { backgroundPosition: '0% 100%' }
  			}
  		},
  		boxShadow: {
  			soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
  			medium: '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  			large: '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  		},
  		backdropBlur: {
  			xs: '2px'
  		},
		spacing: {
			// 4pt/8pt grid system
			'0.5': '0.125rem', // 2px
			'1': '0.25rem',    // 4px
			'1.5': '0.375rem', // 6px
			'2': '0.5rem',     // 8px
			'2.5': '0.625rem', // 10px
			'3': '0.75rem',    // 12px
			'3.5': '0.875rem', // 14px
			'4': '1rem',       // 16px
			'5': '1.25rem',    // 20px
			'6': '1.5rem',     // 24px
			'7': '1.75rem',    // 28px
			'8': '2rem',       // 32px
			'9': '2.25rem',    // 36px
			'10': '2.5rem',    // 40px
			'11': '2.75rem',   // 44px
			'12': '3rem',      // 48px
			'14': '3.5rem',    // 56px
			'16': '4rem',      // 64px
			'18': '4.5rem',    // 72px
			'20': '5rem',      // 80px
			'24': '6rem',      // 96px
			'28': '7rem',      // 112px
			'32': '8rem',      // 128px
			'36': '9rem',      // 144px
			'40': '10rem',     // 160px
			'44': '11rem',     // 176px
			'48': '12rem',     // 192px
			'52': '13rem',     // 208px
			'56': '14rem',     // 224px
			'60': '15rem',     // 240px
			'64': '16rem',     // 256px
			'72': '18rem',     // 288px
			'80': '20rem',     // 320px
			'88': '22rem',     // 352px
			'96': '24rem',     // 384px
			'128': '32rem'     // 512px
		},
  		maxWidth: {
  			'8xl': '88rem',
  			'9xl': '96rem'
  		},
  		zIndex: {
  			'60': '60',
  			'70': '70',
  			'80': '80',
  			'90': '90',
  			'100': '100'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
      require("tailwindcss-animate")
],
} 