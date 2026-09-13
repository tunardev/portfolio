import Link from "next/link";
import { Glyph } from "@/components/Glyph";
import { formatMonth, type Post } from "@/lib/posts";
import styles from "@/app/blog/blog.module.css";

export function PostRow({ post, label }: { post: Post; label?: string }) {
  return (
    <li>
      <Link href={`/blog/${post.slug}`} className={`glyphHost ${styles.row}`}>
        <span className={styles.line}>
          <span className={styles.slot}>{post.glyph && <Glyph name={post.glyph} />}</span>
          <span className={`prose ${styles.title}`}>
            {label && <span className={styles.label}>{label} </span>}
            {post.title}
          </span>
          <time className={styles.date} dateTime={post.date}>
            {formatMonth(post.date)}
          </time>
        </span>
        <span className={styles.minutes}>{post.minutes} min</span>
        <span className={styles.reveal}>
          <span className={styles.excerpt}>{post.excerpt}</span>
        </span>
      </Link>
    </li>
  );
}
