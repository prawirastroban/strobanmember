import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		spacing: {
  			'xs': '4px',
  			'sm': '8px',
  			'md': '12px',
  			'lg': '16px',
  			'xl': '24px',
  			'xxl': '32px',
  		},
  		fontSize: {
  			'ui-body':     ['14px', { lineHeight: '1.5' }],
  			'ui-body-lg':  ['16px', { lineHeight: '1.55' }],
  			'ui-subtitle': ['16px', { lineHeight: '1.5', fontWeight: '500' }],
  			'ui-title':    ['18px', { lineHeight: '1.35', fontWeight: '700', letterSpacing: '-0.01em' }],
  			'ui-title-lg': ['22px', { lineHeight: '1.3',  fontWeight: '700', letterSpacing: '-0.015em' }],
  			'ui-title-xl': ['26px', { lineHeight: '1.25', fontWeight: '700', letterSpacing: '-0.02em' }],
  		},
  		minHeight: {
  			'tap': '44px',
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'fade-in': {
  				'0%': { opacity: '0', transform: 'translateY(10px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			},
  			'scale-in': {
  				'0%': { transform: 'scale(0.95)', opacity: '0' },
  				'100%': { transform: 'scale(1)', opacity: '1' }
  			},
  			'glow-pulse': {
  				'0%, 100%': { boxShadow: '0 0 8px hsl(0 100% 50% / 0.3)' },
  				'50%': { boxShadow: '0 0 20px hsl(0 100% 50% / 0.5), 0 0 40px hsl(0 100% 50% / 0.2)' }
  			},
  			'icon-pulse': {
  				'0%': { transform: 'scale(0.9)' },
  				'50%': { transform: 'scale(1.2)' },
  				'100%': { transform: 'scale(1)' }
  			},
  			'modal-enter': {
  				'0%': { opacity: '0', transform: 'scale(0.95) translateY(8px)' },
  				'100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
  			},
  			'shimmer': {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			},
  			'message-in': {
  				'0%': { opacity: '0', transform: 'translateY(6px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			},
  			'ripple': {
  				'0%': { transform: 'scale(0)', opacity: '0.4' },
  				'100%': { transform: 'scale(2.5)', opacity: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
  			'icon-pulse': 'icon-pulse 0.35s ease-out',
  			'modal-enter': 'modal-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  			'shimmer': 'shimmer 2.2s linear infinite',
  			'message-in': 'message-in 0.4s ease-out',
  			'ripple': 'ripple 0.6s ease-out forwards'
  		},
  		fontFamily: {
  			sans: [
  				'Poppins',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif',
  				'Apple Color Emoji',
  				'Segoe UI Emoji',
  				'Segoe UI Symbol',
  				'Noto Color Emoji'
  			],
  			serif: [
  				'Lora',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
