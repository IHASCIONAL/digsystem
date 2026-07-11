import { useState } from "react";
import authorization from "models/authorization.js";
import { useCurrentUser } from "lib/useCurrentUser.js";
import styles from "./index.module.css";

const EMPTY_FORM_VALUES = { username: "", email: "", password: "" };

export default function CollaboratorRegistrationPage() {
  const { user, isLoading } = useCurrentUser();
  const [formValues, setFormValues] = useState(EMPTY_FORM_VALUES);
  const [status, setStatus] = useState({ type: "idle" });

  function handleChange(event) {
    const { name, value } = event.target;
    setFormValues((previousValues) => ({ ...previousValues, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "submitting" });

    const response = await fetch("/api/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...formValues,
        features: authorization.collaboratorFeatures,
      }),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: responseBody.message });
      return;
    }

    setStatus({ type: "success", collaborator: responseBody });
    setFormValues(EMPTY_FORM_VALUES);
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h1>Cadastro de colaborador</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user?.features?.includes("create:user")) {
    return (
      <div className={styles.container}>
        <h1>Cadastro de colaborador</h1>
        <p className={styles.errorMessage}>
          Acesso restrito a administradores.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Cadastro de colaborador</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          Nome de usuário
          <input
            name="username"
            value={formValues.username}
            onChange={handleChange}
            required
          />
        </label>

        <label className={styles.field}>
          Email
          <input
            type="email"
            name="email"
            value={formValues.email}
            onChange={handleChange}
            required
          />
        </label>

        <label className={styles.field}>
          Senha
          <input
            type="password"
            name="password"
            value={formValues.password}
            onChange={handleChange}
            required
          />
        </label>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={status.type === "submitting"}
        >
          {status.type === "submitting" ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>

      {status.type === "success" && (
        <p className={styles.success}>
          Colaborador {status.collaborator.username} cadastrado com sucesso.
        </p>
      )}

      {status.type === "error" && (
        <p className={styles.errorMessage}>{status.message}</p>
      )}
    </div>
  );
}
