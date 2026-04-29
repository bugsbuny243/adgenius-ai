import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function Bold(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
      <path d="M6 12h9a4 4 0 1 1 0 8H6z" />
    </IconBase>
  );
}

export function Clapperboard(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M4 7 8 3" />
      <path d="M10 7 14 3" />
      <path d="M16 7 20 3" />
    </IconBase>
  );
}

export function Code2(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m8 16-4-4 4-4" />
      <path d="m16 8 4 4-4 4" />
      <path d="m14 4-4 16" />
    </IconBase>
  );
}

export function Image(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </IconBase>
  );
}

export function Italic(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="10" y1="4" x2="18" y2="4" />
      <line x1="6" y1="20" x2="14" y2="20" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </IconBase>
  );
}

export function Music2(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </IconBase>
  );
}

export function Play(props: IconProps) {
  return (
    <IconBase {...props}>
      <polygon points="8 5 19 12 8 19 8 5" />
    </IconBase>
  );
}

export function Radio(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <circle cx="8" cy="13" r="2" />
      <path d="M14 13h4" />
      <path d="M7 3h10" />
    </IconBase>
  );
}

export function Save(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </IconBase>
  );
}

export function Share2(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4" />
      <path d="m15.4 6.5-6.8 4" />
    </IconBase>
  );
}

export function WandSparkles(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m3 21 9-9" />
      <path d="m12 12 9-9" />
      <path d="m14 5 2-2" />
      <path d="M18 6V2" />
      <path d="M22 6h-4" />
    </IconBase>
  );
}
