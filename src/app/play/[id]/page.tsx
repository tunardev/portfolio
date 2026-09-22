import type { Metadata } from "next";
import Link from "next/link";
import { MarkIcon } from "@/components/Mark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FriendGame } from "@/components/game/FriendGame";
import { SITE_NAME } from "@/lib/site";

const MAX_MATCH_ID_LENGTH = 16;
const FALLBACK_MATCH_ID = "game";

export const metadata: Metadata = {
  title: "Four in a row",
  description: "A game of four in a row between two people, on one board, joined by a link.",
  robots: { index: false, follow: false },
};

function sanitiseMatchId(raw: string) {
  return raw.replace(/[^a-z0-9]/gi, "").slice(0, MAX_MATCH_ID_LENGTH) || FALLBACK_MATCH_ID;
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = sanitiseMatchId(id);

  return (
    <main className="column">
      <div className="top">
        <Link href="/" className="name">
          <span className="mark-slot">
            <MarkIcon />
          </span>
          <span>{SITE_NAME}</span>
        </Link>
        <ThemeToggle />
      </div>

      <FriendGame key={matchId} id={matchId} />
    </main>
  );
}
