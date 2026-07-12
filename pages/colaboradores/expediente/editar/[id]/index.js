import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useCurrentUser } from "lib/useCurrentUser.js";
import styles from "./index.module.css";

export default function ShiftEditPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const shiftId = typeof router.query.id === "string" ? router.query.id : null;

  const canAccess = user?.features?.includes("update:shift:admin");

  const [collaboratorUsername, setCollaboratorUsername] = useState(null);
  const [editedInfo, setEditedInfo] = useState(null);
  const [formValues, setFormValues] = useState(null);
  const [status, setStatus] = useState({ type: "loading" });

  useEffect(() => {
    if (!shiftId || !canAccess) return;

    async function loadShift() {
      const response = await fetch(`/api/v1/shifts/${shiftId}`);
      const responseBody = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: responseBody.message });
        return;
      }

      setCollaboratorUsername(responseBody.collaborator_username);
      setEditedInfo(
        responseBody.edited_by_username
          ? {
              username: responseBody.edited_by_username,
              at: responseBody.edited_at,
            }
          : null,
      );
      setFormValues({
        check_in_time: toDatetimeLocalValue(responseBody.check_in_time),
        check_out_time: toDatetimeLocalValue(responseBody.check_out_time),
      });
      setStatus({ type: "idle" });
    }

    loadShift();
  }, [shiftId, canAccess]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormValues((previousValues) => ({ ...previousValues, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "submitting" });

    const payload = {
      check_in_time: new Date(formValues.check_in_time).toISOString(),
      check_out_time: formValues.check_out_time
        ? new Date(formValues.check_out_time).toISOString()
        : null,
    };

    const response = await fetch(`/api/v1/shifts/${shiftId}`, {
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
        <h1>Editar expediente</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className={styles.container}>
        <h1>Editar expediente</h1>
        <p className={styles.errorMessage}>
          Acesso restrito a administradores.
        </p>
      </div>
    );
  }

  if (status.type === "error" && !formValues) {
    return (
      <div className={styles.container}>
        <h1>Editar expediente</h1>
        <p className={styles.errorMessage}>{status.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>
        Editar expediente
        {collaboratorUsername ? ` — ${collaboratorUsername}` : ""}
      </h1>
      <p className={styles.hint}>
        Ajuste o check-in e o check-out, se necessário. A edição fica registrada
        com o seu usuário.
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
            name="check_in_time"
            value={formValues.check_in_time}
            onChange={handleChange}
            required
          />
        </label>

        <label className={styles.field}>
          Check-out
          <input
            type="datetime-local"
            name="check_out_time"
            value={formValues.check_out_time}
            onChange={handleChange}
          />
          <span className={styles.hint}>
            Deixe em branco para manter o expediente em aberto.
          </span>
        </label>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={status.type === "submitting"}
        >
          {status.type === "submitting" ? "Salvando..." : "Salvar"}
        </button>
      </form>

      {status.type === "success" && (
        <p className={styles.success}>Expediente atualizado com sucesso.</p>
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
