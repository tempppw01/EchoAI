import type { Config } from 'tailwindcss';

/**
 * 主题色统一走 CSS 变量，并保留 <alpha-value> 占位符。
 * 这是 Tailwind v3 支持透明度修饰符（bg-card/72）的前提，
 * 写成 hsl(var(--x)) 会让整个透明度修饰族静默失效。
 */
const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        muted: token('muted'),
        'muted-foreground': token('muted-foreground'),
        border: token('border'),
        'border-strong': token('border-strong'),
        card: token('card'),
        surface: token('surface'),
        'surface-soft': token('surface-soft'),
        'surface-raised': token('surface-raised'),
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
        },
        accent: token('accent'),
        info: token('info'),
        success: token('success'),
        warning: token('warning'),
        danger: {
          DEFAULT: token('danger'),
          foreground: token('danger-foreground'),
        },
        ring: token('ring'),
        scrim: token('scrim'),
        stage: {
          DEFAULT: token('stage'),
          soft: token('stage-soft'),
          border: token('stage-border'),
          foreground: token('stage-foreground'),
          muted: token('stage-muted'),
        },
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '14px',
        '4xl': '16px',
        full: '9999px',
      },
      opacity: {
        // 补齐代码里实际使用、但不在 Tailwind 默认刻度上的透明度值。
        // 默认刻度只有 0/5/10/20/25/30/40/50/60/70/75/80/90/95/100，
        // 缺失的值会让整条 class 不生成。
        2: '0.02',
        3: '0.03',
        4: '0.04',
        6: '0.06',
        7: '0.07',
        8: '0.08',
        12: '0.12',
        14: '0.14',
        15: '0.15',
        16: '0.16',
        18: '0.18',
        22: '0.22',
        24: '0.24',
        26: '0.26',
        28: '0.28',
        32: '0.32',
        35: '0.35',
        42: '0.42',
        45: '0.45',
        48: '0.48',
        52: '0.52',
        55: '0.55',
        58: '0.58',
        62: '0.62',
        65: '0.65',
        68: '0.68',
        72: '0.72',
        78: '0.78',
        82: '0.82',
        85: '0.85',
        88: '0.88',
        92: '0.92',
        98: '0.98',
      },
      boxShadow: {
        xs: '0 1px 2px 0 hsl(var(--shadow-color) / 0.04)',
        sm: '0 1px 2px 0 hsl(var(--shadow-color) / 0.06), 0 1px 3px 0 hsl(var(--shadow-color) / 0.05)',
        DEFAULT: '0 1px 3px 0 hsl(var(--shadow-color) / 0.07), 0 1px 2px -1px hsl(var(--shadow-color) / 0.05)',
        md: '0 4px 10px -2px hsl(var(--shadow-color) / 0.08), 0 2px 6px -2px hsl(var(--shadow-color) / 0.05)',
        lg: '0 10px 24px -6px hsl(var(--shadow-color) / 0.12), 0 4px 10px -4px hsl(var(--shadow-color) / 0.06)',
        xl: '0 18px 40px -12px hsl(var(--shadow-color) / 0.18), 0 8px 16px -8px hsl(var(--shadow-color) / 0.08)',
        panel: '0 -12px 32px -20px hsl(var(--shadow-color) / 0.35)',
        'glow-accent': '0 30px 120px -40px hsl(var(--accent) / 0.55)',
        'glow-accent-soft': '0 18px 48px -26px hsl(var(--accent) / 0.6)',
        'glow-stage': '0 18px 60px -28px hsl(var(--stage) / 0.95)',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 180ms ease-out',
        'fade-in': 'fade-in 160ms ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
