import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        poster?: string;
        "camera-controls"?: boolean | string;
        "disable-zoom"?: boolean | string;
        "disable-pan"?: boolean | string;
        "auto-rotate"?: boolean | string;
        "rotation-per-second"?: string;
        style?: CSSProperties;
      };
    }
  }
}

export {};
