import type { Metadata } from "next";
import Link from "next/link";
import { DitherHeader } from "@/components/DitherHeader";
import { PORTRAIT_KINDS } from "@/components/scenes";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Nothing here",
};

export default function NotFound() {
  return (
    <main className={styles.page}>
      <DitherHeader animate={false} kinds={PORTRAIT_KINDS} seed="nothing-here" full className={styles.scene} />

      <p className={styles.note}>
        <span className={styles.lead}>Nothing here.</span>
        <Link href="/" className="underline">
          home
        </Link>
      </p>
    </main>
  );
}
