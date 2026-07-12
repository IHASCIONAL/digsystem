import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "./index.module.css";

const EMPTY_FORM_VALUES = {
  plate: "",
  owner_name: "",
  model: "",
  brand: "",
  color: "",
  notes: "",
};

const OPTIONAL_FIELDS = ["owner_name", "model", "brand", "color", "notes"];

export default function VehicleRegistrationPage() {
  const router = useRouter();
  const [formValues, setFormValues] = useState(EMPTY_FORM_VALUES);
  const [status, setStatus] = useState({ type: "idle" });
  const [returnToOperation, setReturnToOperation] = useState(false);

  useEffect(() => {
    if (typeof router.query.plate === "string") {
      setFormValues((previousValues) => ({
        ...previousValues,
        plate: router.query.plate,
      }));
      setReturnToOperation(true);
    }
  }, [router.query.plate]);

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
            placeholder="ABC1234 ou ABC1D23"
            pattern="[A-Za-z]{3}[0-9][A-Za-z0-9][0-9]{2}"
            title="Formato antigo (ABC1234) ou Mercosul (ABC1D23)"
            maxLength={8}
            required
          />
          <span className={styles.hint}>
            Formato antigo (ABC1234) ou Mercosul (ABC1D23)
          </span>
        </label>

        <label className={styles.field}>
          Nome do responsável
          <input
            name="owner_name"
            value={formValues.owner_name}
            onChange={handleChange}
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

      {status.type === "error" && (
        <p className={styles.errorMessage}>{status.message}</p>
      )}

      {status.type === "success" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <h2>Veículo cadastrado</h2>
            <p>
              O veículo <strong>{status.vehicle.plate}</strong> foi cadastrado
              com sucesso.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={() => {
                  if (returnToOperation) {
                    router.push(
                      `/veiculos/operacao?plate=${encodeURIComponent(status.vehicle.plate)}`,
                    );
                    return;
                  }
                  setStatus({ type: "idle" });
                }}
              >
                {returnToOperation ? "Ir para entrada e saída" : "OK"}
              </button>
            </div>
          </div>
        </div>
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
