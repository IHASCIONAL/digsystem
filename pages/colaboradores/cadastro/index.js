import { useState } from "react";
import authorization from "models/authorization.js";
import { useCurrentUser } from "lib/useCurrentUser.js";
import styles from "./index.module.css";

const EMPTY_FORM_VALUES = {
  username: "",
  full_name: "",
  cpf: "",
  phone: "",
  password: "",
};

const OPTIONAL_FIELDS = ["full_name", "cpf", "phone"];

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
      body: JSON.stringify(buildPayload(formValues)),
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
          Nome de usuário *
          <input
            name="username"
            value={formValues.username}
            onChange={handleChange}
            placeholder="joao_silva"
            pattern="[A-Za-z0-9_]{3,30}"
            title="Letras, números e underscore, sem espaços (3 a 30 caracteres)"
            required
          />
          <span className={styles.hint}>
            Letras, números e underscore, sem espaços (3 a 30 caracteres)
          </span>
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
          Senha *
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

function buildPayload(formValues) {
  const payload = {
    username: formValues.username,
    password: formValues.password,
    features: authorization.collaboratorFeatures,
  };

  for (const field of OPTIONAL_FIELDS) {
    const trimmedValue = formValues[field].trim();
    if (trimmedValue !== "") {
      payload[field] = trimmedValue;
    }
  }

  return payload;
}
