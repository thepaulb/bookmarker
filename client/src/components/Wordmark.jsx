import styles from "./Wordmark.module.scss";

// "BOOKMARKER" with the two O's drawn as owl eyes. The letters are hidden
// from assistive tech and the whole mark reads as "Bookmarker".
export default function Wordmark({ size = "large" }) {
  return (
    <span className={`${styles.mark} ${styles[size]}`} role="img" aria-label="Bookmarker">
      <span aria-hidden="true">B</span>
      <svg className={styles.eyes} viewBox="0 0 62 46" aria-hidden="true">
        <rect x="2" y="2" width="26" height="42" rx="13" />
        <rect x="34" y="2" width="26" height="42" rx="13" />
        <circle cx="16" cy="25" r="6" />
        <circle cx="48" cy="25" r="6" />
      </svg>
      <span aria-hidden="true">kmarker</span>
    </span>
  );
}
