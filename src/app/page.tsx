import Link from "next/link";
import { Chevron } from "@/components/Chevron";
import { EmailCopy } from "@/components/EmailCopy";
import { FigureLoop } from "@/components/FigureLoop";
import { GameGate } from "@/components/GameGate";
import { Lore } from "@/components/Lore";
import { Shelf } from "@/components/Shelf";
import { jsonLdScript } from "@/lib/jsonld";
import {
  AUTHOR,
  EMAIL,
  GLOREE_URL,
  PERSON_ID,
  PROFILES,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  WEBSITE_ID,
  X_HANDLE,
} from "@/lib/site";

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
    worksFor: { "@type": "Organization", name: "Gloree", url: GLOREE_URL },
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

export default function Home() {
  return (
    <main className="column">
      <GameGate>
        <p className="prose">
          I&apos;m 18 and self-taught. I work on distributed systems, machine learning, and moving large amounts of data
          around without losing any of it.
        </p>
        <p className="prose">
          What I like most are the pieces of big things: the consensus protocol under a database, the scheduler under a
          cluster, the parts most people never see.
        </p>

        <FigureLoop />

        <p className="prose">
          Right now I&apos;m building{" "}
          <a href="/gloree" target="_blank" rel="noreferrer" className="underline">
            Gloree
          </a>
          , an agentic spreadsheet for enterprises.
        </p>

        <Lore>
          <p className="prose">
            I started at 11, writing Discord bots for servers I hung around in. At 15 I sold my first project. A small
            exit, but a real one.
          </p>
          <p className="prose">Along the way I competed at ISEF &apos;25 and published a paper in IEEE.</p>
        </Lore>

        <p className="prose">I write a blog when I learn something worth keeping.</p>
        <Link href="/blog" className="chevron-link">
          blog
          <Chevron />
        </Link>

        <p className="prose">
          Write to me at <EmailCopy address={EMAIL} />, or find me at{" "}
          <a href="/x" target="_blank" rel="noreferrer" className="underline">
            {X_HANDLE}
          </a>
          .
        </p>

        <div className="rule" />
        <Shelf />
      </GameGate>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
    </main>
  );
}
