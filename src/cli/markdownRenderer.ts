import { render as renderMarkdown } from 'markdansi';

export function renderMarkdownAnsi(markdown: string): string {
  try {
    return renderMarkdown(markdown, {
      color: Boolean(process.stdout.isTTY),
      width: process.stdout.columns,
      wrap: true,
      hyperlinks: false,
    });
  } catch {
    // Last-resort fallback: return the raw markdown so we never crash.
    return markdown;
  }
}
