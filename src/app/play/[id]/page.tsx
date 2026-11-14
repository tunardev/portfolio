import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { HomeLink } from "@/components/HomeLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FriendGame } from "@/components/game/FriendGame";
import { shared } from "@/styles/shared";

const MAX_MATCH_ID_LENGTH = 16;
const FALLBACK_MATCH_ID = "game";

export const metadata: Metadata = {
  title: "Four in a row",
  description: "A game of four in a row between two people, on one board, joined by a link.",
  robots: { index: false, follow: false },
};

function sanitizeMatchId(raw: string) {
  return raw.replace(/[^a-z0-9]/gi, "").slice(0, MAX_MATCH_ID_LENGTH) || FALLBACK_MATCH_ID;
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = sanitizeMatchId(id);

  return (
    <main {...stylex.props(shared.column)}>
      <div {...stylex.props(shared.header)}>
        <HomeLink />
        <ThemeToggle />
      </div>

      <FriendGame key={matchId} id={matchId} />
    </main>
  );
}
