declare module 'markdansi' {
  interface RenderOptions {
    color?: boolean;
    width?: number;
    wrap?: boolean;
    hyperlinks?: boolean;
    theme?: unknown;
    highlighter?: (code: string, lang?: string) => string | undefined;
  }
  export function render(markdown: string, options?: RenderOptions): string;
  export function createRenderer(options?: RenderOptions): (markdown: string) => string;
  export function strip(markdown: string, options?: RenderOptions): string;
}
