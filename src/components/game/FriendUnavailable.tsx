import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { shared } from "@/styles/shared";
import { gameStyles } from "./gameStyles";

export function FriendUnavailable() {
  return (
    <section {...stylex.props(gameStyles.game)} aria-label="Four in a row with a friend">
      <p {...stylex.props(gameStyles.kicker)}>Four in a row with a friend</p>
      <h2 {...stylex.props(gameStyles.title)}>Friend games are not switched on here yet.</h2>
      <p {...stylex.props(gameStyles.lede)}>
        This copy of the site has no realtime keys. You can still play the model.
      </p>
      <div {...stylex.props(gameStyles.actions)}>
        <Link href="/#play" {...stylex.props(shared.pill)}>
          Play the model
        </Link>
      </div>
    </section>
  );
}
