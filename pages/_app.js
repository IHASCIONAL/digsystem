import Head from "next/head";
import Link from "next/link";
import "styles/globals.css";
import styles from "styles/AppHeader.module.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Sena Park</title>
      </Head>

      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Sena Park
        </Link>
      </header>

      <Component {...pageProps} />
    </>
  );
}
