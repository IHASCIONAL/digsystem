import { useState, useEffect } from "react";
import { useCurrentUser } from "lib/useCurrentUser.js";
import styles from "./index.module.css";

export default function SettingsPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();

  const [dailyRateInput, setDailyRateInput] = useState("");
  const [status, setStatus] = useState({ type: "loading" });

  useEffect(() => {
    if (!user?.features?.includes("read:settings")) return;

    async function loadSettings() {
      const response = await fetch("/api/v1/settings");
      const responseBody = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: responseBody.message });
        return;
      }

      setDailyRateInput((responseBody.daily_rate_cents / 100).toFixed(2));
      setStatus({ type: "idle" });
    }

    loadSettings();
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "submitting" });

    const dailyRateCents = Math.round(
      Number(dailyRateInput.replace(",", ".")) * 100,
    );

    const response = await fetch("/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_rate_cents: dailyRateCents }),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: responseBody.message });
      return;
    }

    setDailyRateInput((responseBody.daily_rate_cents / 100).toFixed(2));
    setStatus({ type: "success" });
  }

  if (isLoadingUser || status.type === "loading") {
    return (
      <div className={styles.container}>
        <h1>Configurações</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user?.features?.includes("read:settings")) {
    return (
      <div className={styles.container}>
        <h1>Configurações</h1>
        <p className={styles.errorMessage}>
          Acesso restrito a administradores.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Configurações</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          Valor da diária (R$)
          <input
            type="text"
            inputMode="decimal"
            value={dailyRateInput}
            onChange={(event) => setDailyRateInput(event.target.value)}
            required
          />
          <span className={styles.hint}>
            Valor cobrado do cliente por permanência, do check-in ao check-out.
          </span>
        </label>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={status.type === "submitting"}
        >
          {status.type === "submitting" ? "Salvando..." : "Salvar"}
        </button>

        {status.type === "success" && (
          <p className={styles.success}>Configuração salva com sucesso.</p>
        )}
        {status.type === "error" && (
          <p className={styles.errorMessage}>{status.message}</p>
        )}
      </form>
    </div>
  );
}
