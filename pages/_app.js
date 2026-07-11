import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import "styles/globals.css";
import styles from "styles/AppHeader.module.css";
import { useCurrentUser } from "lib/useCurrentUser.js";

const PUBLIC_ROUTES = ["/login"];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!user && !isPublicRoute) {
      router.replace("/login");
    }

    if (user && isPublicRoute) {
      router.replace("/");
    }
  }, [isLoading, user, isPublicRoute, router]);

  async function handleLogout() {
    await fetch("/api/v1/sessions", { method: "DELETE" });
    window.location.href = "/login";
  }

  const canRenderPage =
    !isLoading && ((isPublicRoute && !user) || (!isPublicRoute && !!user));

  return (
    <>
      <Head>
        <title>Sena Park</title>
      </Head>

      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Sena Park
        </Link>

        {user && (
          <div className={styles.identity}>
            <span>{user.username}</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Sair
            </button>
          </div>
        )}
      </header>

      {canRenderPage && <Component {...pageProps} />}
    </>
  );
}
