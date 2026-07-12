import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useCurrentUser } from "lib/useCurrentUser.js";
import styles from "./index.module.css";

export default function StayEditPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const stayId = typeof router.query.id === "string" ? router.query.id : null;

  const canAccess = user?.features?.includes("update:stay:admin");

  const [plate, setPlate] = useState(null);
  const [editedInfo, setEditedInfo] = useState(null);
  const [formValues, setFormValues] = useState(null);
  const [status, setStatus] = useState({ type: "loading" });

  useEffect(() => {
    if (!stayId || !canAccess) return;

    async function loadStay() {
      const response = await fetch(`/api/v1/stays/${stayId}`);
      const responseBody = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: responseBody.message });
        return;
      }

      setPlate(responseBody.plate);
      setEditedInfo(
        responseBody.edited_by_username
          ? {
              username: responseBody.edited_by_username,
              at: responseBody.edited_at,
            }
          : null,
      );
      setFormValues({
        entry_time: toDatetimeLocalValue(responseBody.entry_time),
        exit_time: toDatetimeLocalValue(responseBody.exit_time),
        price_reais:
          responseBody.price_cents != null
            ? (responseBody.price_cents / 100).toFixed(2)
            : "",
      });
      setStatus({ type: "idle" });
    }

    loadStay();
  }, [stayId, canAccess]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormValues((previousValues) => ({ ...previousValues, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "submitting" });

    const payload = {
      entry_time: new Date(formValues.entry_time).toISOString(),
      exit_time: formValues.exit_time
        ? new Date(formValues.exit_time).toISOString()
        : null,
      price_cents: formValues.exit_time
        ? Math.round(Number(formValues.price_reais.replace(",", ".")) * 100)
        : null,
    };

    const response = await fetch(`/api/v1/stays/${stayId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: responseBody.message });
      return;
    }

    setEditedInfo({
      username: user.username,
      at: responseBody.edited_at,
    });
    setStatus({ type: "success" });
  }

  if (isLoadingUser || status.type === "loading") {
    return (
      <div className={styles.container}>
        <h1>Editar permanência</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className={styles.container}>
        <h1>Editar permanência</h1>
        <p className={styles.errorMessage}>
          Acesso restrito a administradores.
        </p>
      </div>
    );
  }

  if (status.type === "error" && !formValues) {
    return (
      <div className={styles.container}>
        <h1>Editar permanência</h1>
        <p className={styles.errorMessage}>{status.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Editar permanência{plate ? ` — ${plate}` : ""}</h1>
      <p className={styles.hint}>
        Ajuste o check-in, o check-out e o valor cobrado, se necessário. A
        edição fica registrada com o seu usuário.
      </p>

      {editedInfo && (
        <p className={styles.editedNotice}>
          Editado por <strong>{editedInfo.username}</strong> em{" "}
          {new Date(editedInfo.at).toLocaleString("pt-BR")}.
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          Check-in
          <input
            type="datetime-local"
            name="entry_time"
            value={formValues.entry_time}
            onChange={handleChange}
            required
          />
        </label>

        <label className={styles.field}>
          Check-out
          <input
            type="datetime-local"
            name="exit_time"
            value={formValues.exit_time}
            onChange={handleChange}
          />
          <span className={styles.hint}>
            Deixe em branco para manter a permanência em aberto.
          </span>
        </label>

        {formValues.exit_time && (
          <label className={styles.field}>
            Valor (R$)
            <input
              type="text"
              inputMode="decimal"
              name="price_reais"
              value={formValues.price_reais}
              onChange={handleChange}
              required
            />
          </label>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={status.type === "submitting"}
        >
          {status.type === "submitting" ? "Salvando..." : "Salvar"}
        </button>
      </form>

      {status.type === "success" && (
        <p className={styles.success}>Permanência atualizada com sucesso.</p>
      )}
      {status.type === "error" && (
        <p className={styles.errorMessage}>{status.message}</p>
      )}
    </div>
  );
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
