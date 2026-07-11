import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useCurrentUser } from "lib/useCurrentUser.js";
import styles from "./index.module.css";

const OPTIONAL_FIELDS = ["full_name", "cpf", "phone"];

export default function CollaboratorEditPage() {
  const router = useRouter();
  const routeUsername =
    typeof router.query.username === "string" ? router.query.username : null;

  const { user: currentUser, isLoading: isLoadingUser } = useCurrentUser();

  const [targetUsername, setTargetUsername] = useState(null);
  const [formValues, setFormValues] = useState(null);
  const [status, setStatus] = useState({ type: "loading" });

  useEffect(() => {
    if (
      !routeUsername ||
      !currentUser?.features?.includes("update:user:others")
    ) {
      return;
    }

    async function loadCollaborator() {
      const response = await fetch(`/api/v1/users/${routeUsername}`);
      const responseBody = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: responseBody.message });
        return;
      }

      setTargetUsername(responseBody.username);
      setFormValues({
        username: responseBody.username,
        full_name: responseBody.full_name || "",
        cpf: responseBody.cpf || "",
        phone: responseBody.phone || "",
        password: "",
      });
      setStatus({ type: "idle" });
    }

    loadCollaborator();
  }, [routeUsername, currentUser]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormValues((previousValues) => ({ ...previousValues, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "submitting" });

    const response = await fetch(`/api/v1/users/${targetUsername}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(formValues)),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: responseBody.message });
      return;
    }

    setTargetUsername(responseBody.username);
    setFormValues((previousValues) => ({
      ...previousValues,
      username: responseBody.username,
      password: "",
    }));
    setStatus({ type: "success" });
  }

  if (isLoadingUser || status.type === "loading") {
    return (
      <div className={styles.container}>
        <h1>Editar colaborador</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!currentUser?.features?.includes("update:user:others")) {
    return (
      <div className={styles.container}>
        <h1>Editar colaborador</h1>
        <p className={styles.errorMessage}>
          Acesso restrito a administradores.
        </p>
      </div>
    );
  }

  if (status.type === "error" && !formValues) {
    return (
      <div className={styles.container}>
        <h1>Editar colaborador</h1>
        <p className={styles.errorMessage}>{status.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Editar colaborador</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          Nome de usuário
          <input
            name="username"
            value={formValues.username}
            onChange={handleChange}
            pattern="[A-Za-z0-9_]{3,30}"
            title="Letras, números e underscore, sem espaços (3 a 30 caracteres)"
            required
          />
        </label>

        <label className={styles.field}>
          Nome completo
          <input
            name="full_name"
            value={formValues.full_name}
            onChange={handleChange}
          />
        </label>

        <label className={styles.field}>
          CPF
          <input
            name="cpf"
            value={formValues.cpf}
            onChange={handleChange}
            placeholder="000.000.000-00"
          />
        </label>

        <label className={styles.field}>
          Telefone
          <input
            name="phone"
            value={formValues.phone}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
          />
        </label>

        <label className={styles.field}>
          Nova senha
          <input
            type="password"
            name="password"
            value={formValues.password}
            onChange={handleChange}
          />
          <span className={styles.hint}>
            Deixe em branco para manter a senha atual.
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
        <p className={styles.success}>Colaborador atualizado com sucesso.</p>
      )}

      {status.type === "error" && (
        <p className={styles.errorMessage}>{status.message}</p>
      )}
    </div>
  );
}

function buildPayload(formValues) {
  const payload = { username: formValues.username };

  for (const field of OPTIONAL_FIELDS) {
    const trimmedValue = formValues[field].trim();
    payload[field] = trimmedValue === "" ? null : trimmedValue;
  }

  if (formValues.password.trim() !== "") {
    payload.password = formValues.password;
  }

  return payload;
}
