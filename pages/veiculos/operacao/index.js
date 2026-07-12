import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { formatElapsedTime } from "lib/formatElapsedTime.js";
import { formatCentsAsCurrency } from "lib/formatCurrency.js";
import styles from "./index.module.css";

async function fetchAPI(key) {
  const response = await fetch(key);
  return response.json();
}

export default function VehicleOperationPage() {
  const [plate, setPlate] = useState("");
  const [status, setStatus] = useState({ type: "idle" });
  const [unregisteredPlate, setUnregisteredPlate] = useState(null);
  const [checkinSuccessPlate, setCheckinSuccessPlate] = useState(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [pendingCheckoutPlate, setPendingCheckoutPlate] = useState(null);

  const {
    data: parkedVehicles,
    isLoading: isLoadingParked,
    mutate: mutateParked,
  } = useSWR("/api/v1/stays", fetchAPI, { refreshInterval: 10000 });

  const isSubmitting = status.type === "submitting";
  const isPlateEmpty = plate.trim() === "";

  async function handleCheckIn() {
    await performAction("POST", "checkin", plate.trim());
    setPlate("");
  }

  async function handleCheckOut() {
    await performAction("PATCH", "checkout", plate.trim());
    setPlate("");
  }

  async function confirmQuickCheckout() {
    await performAction("PATCH", "checkout", pendingCheckoutPlate);
    setPendingCheckoutPlate(null);
  }

  async function performAction(method, action, submittedPlate) {
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
      if (action === "checkin" && response.status === 404) {
        setStatus({ type: "idle" });
        setUnregisteredPlate(submittedPlate);
        return;
      }

      setStatus({ type: "error", message: responseBody.message });
      return;
    }

    setStatus({ type: "idle" });

    if (action === "checkin") {
      setCheckinSuccessPlate(submittedPlate);
    } else {
      setCheckoutSuccess({
        plate: submittedPlate,
        durationInSeconds: responseBody.duration_in_seconds,
        priceCents: responseBody.price_cents,
      });
    }
    mutateParked();
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

      {status.type === "error" && (
        <p className={styles.errorMessage}>{status.message}</p>
      )}

      <h2 className={styles.sectionTitle}>Veículos estacionados</h2>

      {isLoadingParked && <p className={styles.hint}>Carregando...</p>}

      {!isLoadingParked && parkedVehicles?.length === 0 && (
        <p className={styles.empty}>Nenhum veículo estacionado no momento.</p>
      )}

      {!isLoadingParked && parkedVehicles?.length > 0 && (
        <ul className={styles.parkedList}>
          {parkedVehicles.map((stay) => (
            <li key={stay.id} className={styles.parkedRow}>
              <div>
                <span className={styles.parkedPlate}>{stay.plate}</span>
                {stay.model && (
                  <span className={styles.parkedModel}> — {stay.model}</span>
                )}
              </div>
              <button
                type="button"
                className={styles.quickCheckoutButton}
                onClick={() => setPendingCheckoutPlate(stay.plate)}
              >
                Registrar saída
              </button>
            </li>
          ))}
        </ul>
      )}

      {unregisteredPlate && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <h2>Veículo não cadastrado</h2>
            <p>
              A placa <strong>{unregisteredPlate}</strong> ainda não está
              cadastrada. Deseja cadastrá-la agora?
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelButton}
                onClick={() => setUnregisteredPlate(null)}
              >
                Cancelar
              </button>
              <Link
                href={`/veiculos/cadastro?plate=${encodeURIComponent(unregisteredPlate)}`}
                className={styles.modalConfirmButton}
              >
                Cadastrar veículo
              </Link>
            </div>
          </div>
        </div>
      )}

      {checkinSuccessPlate && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <h2>Entrada registrada</h2>
            <p>
              A entrada do veículo <strong>{checkinSuccessPlate}</strong> foi
              registrada com sucesso.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={() => setCheckinSuccessPlate(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutSuccess && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <h2>Saída registrada</h2>
            <p>
              A saída do veículo <strong>{checkoutSuccess.plate}</strong> foi
              registrada com sucesso.
            </p>
            <div className={styles.checkoutSummary}>
              <div className={styles.checkoutSummaryRow}>
                <span>Permanência</span>
                <span>
                  {formatElapsedTime(checkoutSuccess.durationInSeconds)}
                </span>
              </div>
              <div className={styles.checkoutSummaryRow}>
                <span>Valor total</span>
                <span className={styles.checkoutTotal}>
                  {formatCentsAsCurrency(checkoutSuccess.priceCents)}
                </span>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={() => setCheckoutSuccess(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingCheckoutPlate && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <h2>Confirmar saída</h2>
            <p>
              Deseja registrar a saída do veículo{" "}
              <strong>{pendingCheckoutPlate}</strong> agora?
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelButton}
                onClick={() => setPendingCheckoutPlate(null)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalConfirmButton}
                onClick={confirmQuickCheckout}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registrando..." : "Confirmar saída"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
