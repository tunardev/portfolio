import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { Chevron } from "@/components/Chevron";
import { EmailCopy } from "@/components/EmailCopy";
import { FigureLoop } from "@/components/FigureLoop";
import { GameGate } from "@/components/GameGate";
import { Lore } from "@/components/Lore";
import { Shelf } from "@/components/Shelf";
import { calculateAge } from "@/lib/calculate-age";
import { jsonLdScript } from "@/lib/jsonld";
import {
  AUTHOR,
  AUTHOR_BIRTH_DATE,
  EMAIL,
  INSTRACT_URL,
  PERSON_ID,
  PROFILES,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  WEBSITE_ID,
  X_HANDLE,
} from "@/lib/site";
import { chevronLinkMarker } from "@/styles/markers.stylex";
import { shared } from "@/styles/shared";

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: AUTHOR,
    alternateName: X_HANDLE.replace("@", ""),
    url: SITE_URL,
    email: `mailto:${EMAIL}`,
    jobTitle: "Software engineer",
    description: SITE_DESCRIPTION,
    sameAs: PROFILES,
    knowsAbout: ["Distributed systems", "Databases", "Machine learning", "Data migration"],
    worksFor: { "@type": "Organization", name: "Instract", url: INSTRACT_URL },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
  },
];

export const revalidate = 86400;

export default function Home() {
  return (
    <main {...stylex.props(shared.column)}>
      <GameGate>
        <p {...stylex.props(shared.prose)}>
          I&apos;m {calculateAge(AUTHOR_BIRTH_DATE)} and self-taught. I work on distributed systems, machine learning,
          and moving large amounts of data around without losing any of it.
        </p>
        <p {...stylex.props(shared.prose)}>
          What I like most are the pieces of big things: the consensus protocol under a database, the scheduler under a
          cluster, the parts most people never see.
        </p>

        <FigureLoop />

        <p {...stylex.props(shared.prose)}>
          Right now I&apos;m building{" "}
          <a href="/instract" target="_blank" rel="noreferrer" {...stylex.props(shared.underline)}>
            Instract
          </a>
          , custom AI software for enterprises.
        </p>

        <Lore>
          <p {...stylex.props(shared.prose)}>
            I started at 11, writing Discord bots for servers I hung around in. At 15 I sold my first project. A small
            exit, but a real one.
          </p>
          <p {...stylex.props(shared.prose)}>
            Along the way I competed at ISEF &apos;25 and published a paper in IEEE.
          </p>
        </Lore>

        <p {...stylex.props(shared.prose)}>I write a blog when I learn something worth keeping.</p>
        <Link href="/blog" {...stylex.props(shared.chevronLink, chevronLinkMarker)}>
          blog
          <Chevron />
        </Link>

        <p {...stylex.props(shared.prose)}>
          Write to me at <EmailCopy address={EMAIL} />, or find me at{" "}
          <a href="/x" target="_blank" rel="noreferrer" {...stylex.props(shared.underline)}>
            {X_HANDLE}
          </a>
          .
        </p>

        <div {...stylex.props(shared.rule)} />
        <Shelf />
      </GameGate>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
    </main>
  );
}
