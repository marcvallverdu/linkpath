const NETWORK_PATTERNS: Record<string, RegExp> = {
  awin: /awin1\.com|awltovhc\.com|zenaps\.com/i,
  cj: /(dpbolvw|jdoqocy|tkqlhce|anrdoezrs|kqzyfj)\.(net|com)/i,
  rakuten: /click\.linksynergy\.com|linksynergy\.walmart/i,
  impact: /impact\.com|\.sjv\.io|\.evyy\.net/i,
  shareasale: /shareasale\.com|shrsl\.com/i,
  amazon: /amazon\.[a-z.]+.*[?&]tag=|amzn\.to/i,
};

export function detectNetwork(url: string): string {
  for (const [network, pattern] of Object.entries(NETWORK_PATTERNS)) {
    if (pattern.test(url)) {
      return network;
    }
  }
  return "unknown";
}
