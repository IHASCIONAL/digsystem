import { useState } from "react";
import { formatElapsedTime } from "lib/formatElapsedTime.js";
import styles from "./index.module.css";

export default function VehicleOperationPage() {
  const [plate, setPlate] = useState("");
  const [status, setStatus] = useState({ type: "idle" });

  const isSubmitting = status.type === "submitting";
  const isPlateEmpty = plate.trim() === "";

  async function handleCheckIn() {
    await performAction("POST", "checkin");
  }

  async function handleCheckOut() {
    await performAction("PATCH", "checkout");
  }

  async function performAction(method, action) {
    const submittedPlate = plate.trim();
    setStatus({ type: "submitting" });

    const response = await fetch("/api/v1/stays", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plate: submittedPlate }),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: responseBody.message });
      return;
    }

    setStatus({
      type: "success",
      action,
      plate: submittedPlate,
      stay: responseBody,
    });
    setPlate("");
  }

  return (
    <div className={styles.container}>
      <h1>Entrada e saída</h1>

      <label className={styles.field}>
        Placa
        <input
          value={plate}
          onChange={(event) => setPlate(event.target.value)}
          placeholder="ABC1234 ou ABC1D23"
          maxLength={8}
        />
      </label>
      <p className={styles.hint}>
        Formato antigo (ABC1234) ou Mercosul (ABC1D23)
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.checkInButton}
          onClick={handleCheckIn}
          disabled={isSubmitting || isPlateEmpty}
        >
          Registrar entrada
        </button>
        <button
          type="button"
          className={styles.checkOutButton}
          onClick={handleCheckOut}
          disabled={isSubmitting || isPlateEmpty}
        >
          Registrar saída
        </button>
      </div>

      {status.type === "success" && status.action === "checkin" && (
        <p className={styles.success}>
          Entrada registrada para {status.plate}.
        </p>
      )}

      {status.type === "success" && status.action === "checkout" && (
        <p className={styles.success}>
          Saída registrada para {status.plate}. Permanência:{" "}
          {formatElapsedTime(status.stay.duration_in_seconds)}.
        </p>
      )}

      {status.type === "error" && (
        <p className={styles.errorMessage}>{status.message}</p>
      )}
    </div>
  );
}
