declare module 'html-to-image' {
  export function toPng(
    node: HTMLElement,
    options?: {
      quality?: number;
      backgroundColor?: string;
      width?: number;
      height?: number;
      style?: Partial<CSSStyleDeclaration>;
      pixelRatio?: number;
      cacheBust?: boolean;
    }
  ): Promise<string>;
}
