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
