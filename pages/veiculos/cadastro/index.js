import { useState } from "react";
import styles from "./index.module.css";

const EMPTY_FORM_VALUES = {
  plate: "",
  model: "",
  brand: "",
  color: "",
  notes: "",
};

const OPTIONAL_FIELDS = ["model", "brand", "color", "notes"];

export default function VehicleRegistrationPage() {
  const [formValues, setFormValues] = useState(EMPTY_FORM_VALUES);
  const [status, setStatus] = useState({ type: "idle" });

  function handleChange(event) {
    const { name, value } = event.target;
    setFormValues((previousValues) => ({ ...previousValues, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "submitting" });

    const response = await fetch("/api/v1/vehicles", {
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

    setStatus({ type: "success", vehicle: responseBody });
    setFormValues(EMPTY_FORM_VALUES);
  }

  return (
    <div className={styles.container}>
      <h1>Cadastro de veículo</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          Placa *
          <input
            name="plate"
            value={formValues.plate}
            onChange={handleChange}
            maxLength={8}
            required
          />
        </label>

        <label className={styles.field}>
          Modelo
          <input
            name="model"
            value={formValues.model}
            onChange={handleChange}
          />
        </label>

        <label className={styles.field}>
          Marca
          <input
            name="brand"
            value={formValues.brand}
            onChange={handleChange}
          />
        </label>

        <label className={styles.field}>
          Cor
          <input
            name="color"
            value={formValues.color}
            onChange={handleChange}
          />
        </label>

        <label className={styles.field}>
          Observações
          <textarea
            name="notes"
            value={formValues.notes}
            onChange={handleChange}
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
          Veículo {status.vehicle.plate} cadastrado com sucesso.
        </p>
      )}

      {status.type === "error" && (
        <p className={styles.errorMessage}>{status.message}</p>
      )}
    </div>
  );
}

function buildPayload(formValues) {
  const payload = { plate: formValues.plate };

  for (const field of OPTIONAL_FIELDS) {
    const trimmedValue = formValues[field].trim();
    if (trimmedValue !== "") {
      payload[field] = trimmedValue;
    }
  }

  return payload;
}
