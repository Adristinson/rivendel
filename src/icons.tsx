const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const Plus = ({ size = 22, w = 2.2 }: { size?: number; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={w} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Minus = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.2} {...base}>
    <path d="M5 12h14" />
  </svg>
);

export const Check = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={3} {...base}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const Trash = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.9} {...base}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

export const Back = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...base}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const Chevron = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...base}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const Home = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" strokeWidth={1.8} {...base}>
    <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />
  </svg>
);

export const Cart = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" strokeWidth={1.9} {...base}>
    <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6" />
    <circle cx="9" cy="20" r="1.3" />
    <circle cx="17" cy="20" r="1.3" />
  </svg>
);

export const Food = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" strokeWidth={1.8} {...base}>
    <path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v6M9 3v6M17 21V3c-2 1-3 4-3 8h3" />
  </svg>
);

export const More = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" strokeWidth={1.8} {...base}>
    <circle cx="5" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="19" cy="12" r="1.4" />
  </svg>
);

export const CloudOff = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...base}>
    <path d="M3 3l18 18M8 7.3A5 5 0 0 1 16.9 10H17a4 4 0 0 1 2.6 7M17 18H7a4 4 0 0 1-1.4-7.8" />
  </svg>
);

export const Euro = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" strokeWidth={1.8} {...base}>
    <path d="M18 6.5A7 7 0 1 0 18 17.5M4 10.5h9M4 13.5h9" />
  </svg>
);

export const Tasks = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" strokeWidth={1.8} {...base}>
    <path d="M4 6.5l1.5 1.5L8 5.5M4 12.5l1.5 1.5L8 11.5M4 18.5l1.5 1.5L8 17.5M11 7h9M11 13h9M11 19h9" />
  </svg>
);

export const Gear = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" strokeWidth={1.8} {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const Suitcase = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" strokeWidth={1.8} {...base}>
    <rect x="4" y="7" width="16" height="13" rx="2.5" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M9 7v13M15 7v13" />
  </svg>
);
