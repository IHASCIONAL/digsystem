import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "./index.module.css";

const OPTIONAL_FIELDS = ["owner_name", "model", "brand", "color", "notes"];

export default function VehicleEditPage() {
  const router = useRouter();
  const routePlate =
    typeof router.query.plate === "string" ? router.query.plate : null;

  const [targetPlate, setTargetPlate] = useState(null);
  const [formValues, setFormValues] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);
  const [status, setStatus] = useState({ type: "loading" });

  useEffect(() => {
    if (!routePlate) return;

    async function loadVehicle() {
      const response = await fetch(`/api/v1/vehicles/${routePlate}`);
      const responseBody = await response.json();

      if (!response.ok) {
        setStatus({ type: "error", message: responseBody.message });
        return;
      }

      setTargetPlate(responseBody.plate);
      setCreatedAt(responseBody.created_at);
      setFormValues({
        plate: responseBody.plate,
        owner_name: responseBody.owner_name || "",
        model: responseBody.model || "",
        brand: responseBody.brand || "",
        color: responseBody.color || "",
        notes: responseBody.notes || "",
      });
      setStatus({ type: "idle" });
    }

    loadVehicle();
  }, [routePlate]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormValues((previousValues) => ({ ...previousValues, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ type: "submitting" });

    const response = await fetch(`/api/v1/vehicles/${targetPlate}`, {
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

    setTargetPlate(responseBody.plate);
    setStatus({ type: "success" });
  }

  if (status.type === "loading") {
    return (
      <div className={styles.container}>
        <h1>Editar veículo</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (status.type === "error" && !formValues) {
    return (
      <div className={styles.container}>
        <h1>Editar veículo</h1>
        <p className={styles.errorMessage}>{status.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Editar veículo</h1>
      {createdAt && (
        <p className={styles.hint}>
          Cadastrado em {new Date(createdAt).toLocaleString("pt-BR")}
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          Placa
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
          {status.type === "submitting" ? "Salvando..." : "Salvar"}
        </button>
      </form>

      {status.type === "success" && (
        <p className={styles.success}>Veículo atualizado com sucesso.</p>
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
    payload[field] = trimmedValue === "" ? null : trimmedValue;
  }

  return payload;
}
