import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import useSWR from "swr";
import "styles/globals.css";
import styles from "styles/AppHeader.module.css";
import { useCurrentUser } from "lib/useCurrentUser.js";
import { formatElapsedTime } from "lib/formatElapsedTime.js";

const PUBLIC_ROUTES = ["/login"];

async function fetchAPI(key) {
  const response = await fetch(key);
  return response.json();
}

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

  const isAdmin = user?.features?.includes("create:user");
  const isCollaborator = !!user && !isAdmin;

  return (
    <>
      <Head>
        <title>Parar Park</title>
      </Head>

      <div className={isCollaborator ? "collaboratorAccent" : undefined}>
        <header
          className={
            isCollaborator
              ? `${styles.header} ${styles.headerCollaborator}`
              : styles.header
          }
        >
          <Link href="/" className={styles.brand}>
            Parar Park
          </Link>

          {user && (
            <div className={styles.identity}>
              {isCollaborator && <ShiftControl />}
              <span>{user.username}</span>
              <button onClick={handleLogout} className={styles.logoutButton}>
                Sair
              </button>
            </div>
          )}
        </header>

        {canRenderPage && <Component {...pageProps} />}
      </div>
    </>
  );
}

function ShiftControl() {
  const { data, isLoading, mutate } = useSWR("/api/v1/shifts/me", fetchAPI, {
    refreshInterval: 30000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const openShift = data?.shift || null;

  useEffect(() => {
    if (!openShift) return;

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [openShift]);

  async function confirmCheckIn() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/v1/shifts", { method: "POST" });

    if (!response.ok) {
      const responseBody = await response.json();
      setError(responseBody.message);
      setIsSubmitting(false);
      setPendingAction(null);
      return;
    }

    await mutate();
    setIsSubmitting(false);
    setPendingAction(null);
  }

  async function confirmCheckOut() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/v1/shifts", { method: "PATCH" });

    if (!response.ok) {
      const responseBody = await response.json();
      setError(responseBody.message);
      setIsSubmitting(false);
      setPendingAction(null);
      return;
    }

    await mutate();
    setIsSubmitting(false);
    setPendingAction(null);
  }

  if (isLoading || !data) {
    return null;
  }

  const elapsedInSeconds = openShift
    ? Math.max(0, Math.round((now - new Date(openShift.check_in_time)) / 1000))
    : 0;

  return (
    <div className={styles.shiftControl}>
      {error && <span className={styles.shiftError}>{error}</span>}

      {openShift ? (
        <button
          type="button"
          className={styles.checkOutButton}
          onClick={() => setPendingAction("checkout")}
          disabled={isSubmitting}
        >
          Fazer check-out ({formatElapsedTime(elapsedInSeconds)})
        </button>
      ) : (
        <button
          type="button"
          className={styles.checkInButton}
          onClick={() => setPendingAction("checkin")}
          disabled={isSubmitting}
        >
          Fazer check-in
        </button>
      )}

      {pendingAction && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            {pendingAction === "checkin" ? (
              <>
                <h2>Confirmar check-in</h2>
                <p>Deseja registrar o início do seu expediente agora?</p>
              </>
            ) : (
              <>
                <h2>Confirmar check-out</h2>
                <p>
                  Deseja encerrar o seu expediente agora? Tempo decorrido:{" "}
                  {formatElapsedTime(elapsedInSeconds)}.
                </p>
              </>
            )}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelButton}
                onClick={() => setPendingAction(null)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={
                  pendingAction === "checkin" ? confirmCheckIn : confirmCheckOut
                }
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registrando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
