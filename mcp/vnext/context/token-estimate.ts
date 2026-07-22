export function estimateTokensFromBytes(bytes: number): number {
  return Math.ceil(bytes / 4);
}

export function estimateTokens(text: string): number {
  return estimateTokensFromBytes(Buffer.byteLength(text, "utf8"));
}
