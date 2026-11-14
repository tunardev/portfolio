import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "@/styles/tokens.stylex";

export function PostList({ children, style }: { children: ReactNode; style?: stylex.StyleXStyles }) {
  return <ul {...stylex.props(styles.list, style)}>{children}</ul>;
}

const styles = stylex.create({
  list: {
    inlineSize: "100%",
    margin: 0,
    padding: 0,
    listStyle: "none",
    borderBlockEndWidth: "1px",
    borderBlockEndStyle: "solid",
    borderBlockEndColor: colors.line,
  },
});
