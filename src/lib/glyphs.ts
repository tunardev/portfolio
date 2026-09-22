const NAMES = ["raft", "wal", "ring", "backprop", "merkle", "move"] as const;

export type GlyphName = (typeof NAMES)[number];

export const GLYPHS: GlyphName[] = [...NAMES];
