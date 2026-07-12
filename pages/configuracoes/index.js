import { useState, useEffect } from "react";
import { useCurrentUser } from "lib/useCurrentUser.js";
import styles from "./index.module.css";

export default function SettingsPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();

  const [ratePer12hInput, setRatePer12hInput] = useState("");
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

      setRatePer12hInput((responseBody.rate_per_12h_cents / 100).toFixed(2));
      setStatus({ type: "idle" });
    }

    loadSettings();
  }, [user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "submitting" });

    const ratePer12hCents = Math.round(
      Number(ratePer12hInput.replace(",", ".")) * 100,
    );

    const response = await fetch("/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rate_per_12h_cents: ratePer12hCents }),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: responseBody.message });
      return;
    }

    setRatePer12hInput((responseBody.rate_per_12h_cents / 100).toFixed(2));
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
          Valor cobrado a cada 12 horas (R$)
          <input
            type="text"
            inputMode="decimal"
            value={ratePer12hInput}
            onChange={(event) => setRatePer12hInput(event.target.value)}
            required
          />
          <span className={styles.hint}>
            O valor é multiplicado pelo número de blocos de 12h da permanência
            (arredondado para cima). Ex.: 13h de permanência cobram 2 blocos.
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
