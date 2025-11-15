export function parseDuration(input: string, fallback: number): number {
  if (!input) {
    return fallback;
  }
  const match = /^([0-9]+)(ms|s|m)?$/i.exec(input.trim());
  if (!match) {
    return fallback;
  }
  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (!unit || unit === 'ms') {
    return value;
  }
  if (unit === 's') {
    return value * 1000;
  }
  if (unit === 'm') {
    return value * 60_000;
  }
  return fallback;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function estimateTokenCount(text: string): number {
  if (!text) {
    return 0;
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  const estimate = Math.max(words.length * 0.75, text.length / 4);
  return Math.max(1, Math.round(estimate));
}
