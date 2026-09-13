import Link from "next/link";
import styles from "./FourInARow.module.css";

export function FriendUnavailable() {
  return (
    <section className={styles.game} aria-label="Four in a row with a friend">
      <p className={styles.kicker}>Four in a row with a friend</p>
      <h2 className={styles.title}>Friend games are not switched on here yet.</h2>
      <p className={styles.lede}>This copy of the site has no realtime keys. You can still play the model.</p>
      <div className={styles.actions}>
        <Link href="/#play" className="pill">
          Play the model
        </Link>
      </div>
    </section>
  );
}
