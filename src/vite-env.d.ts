/// <reference types="vite/client" />

/* eslint-disable @typescript-eslint/no-empty-interface */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': {
        url: string;
        [key: string]: any;
      } & React.HTMLAttributes<HTMLElement>;
    }
  }
}
/* eslint-enable @typescript-eslint/no-empty-interface */

export {};
