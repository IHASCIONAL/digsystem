import { useState } from "react";
import styles from "./index.module.css";

export default function LoginPage() {
  const [formValues, setFormValues] = useState({
    username: "",
    password: "",
  });
  const [status, setStatus] = useState({ type: "idle" });

  function handleChange(event) {
    const { name, value } = event.target;
    setFormValues((previousValues) => ({ ...previousValues, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "submitting" });

    const response = await fetch("/api/v1/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formValues),
    });

    if (!response.ok) {
      const responseBody = await response.json();
      setStatus({ type: "error", message: responseBody.message });
      return;
    }

    // Full reload so the header's session check picks up the new cookie.
    window.location.href = "/";
  }

  return (
    <div className={styles.container}>
      <h1>Entrar</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          Nome de usuário
          <input
            type="text"
            name="username"
            value={formValues.username}
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
          {status.type === "submitting" ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {status.type === "error" && (
        <p className={styles.errorMessage}>{status.message}</p>
      )}
    </div>
  );
}
