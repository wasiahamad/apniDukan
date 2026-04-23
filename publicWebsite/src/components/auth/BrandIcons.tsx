import type React from "react";

type BrandIconProps = React.SVGProps<SVGSVGElement>;

export function GoogleIcon(props: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.48a5.55 5.55 0 0 1-2.4 3.64v3.06h3.88c2.27-2.09 3.53-5.17 3.53-8.89Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.06c-1.08.72-2.46 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.14A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.24A7.2 7.2 0 0 1 4.9 12c0-.78.14-1.54.37-2.24V6.62H1.27A12 12 0 0 0 0 12c0 1.93.46 3.75 1.27 5.38l4-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.14C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}

export function FacebookIcon(props: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M13.5 22v-8h2.7l.4-3H13.5V9.1c0-.87.24-1.46 1.49-1.46H16.7V4.96C16.4 4.92 15.38 4.8 14.2 4.8c-2.47 0-4.16 1.5-4.16 4.26V11H7.5v3h2.54v8h3.46Z"
      />
    </svg>
  );
}
