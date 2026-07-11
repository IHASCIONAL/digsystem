import { useState } from "react";
import { formatElapsedTime } from "lib/formatElapsedTime.js";
import styles from "./index.module.css";

export default function VehicleHistoryPage() {
  const [plate, setPlate] = useState("");
  const [status, setStatus] = useState({ type: "idle" });

  const isSearching = status.type === "loading";

  async function handleSearch(event) {
    event.preventDefault();

    const searchedPlate = plate.trim();
    if (searchedPlate === "") return;

    setStatus({ type: "loading" });

    const response = await fetch(`/api/v1/vehicles/${searchedPlate}/stays`);
    const responseBody = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: responseBody.message });
      return;
    }

    setStatus({ type: "success", plate: searchedPlate, stays: responseBody });
  }

  return (
    <div className={styles.container}>
      <h1>Histórico</h1>

      <form onSubmit={handleSearch} className={styles.searchRow}>
        <input
          value={plate}
          onChange={(event) => setPlate(event.target.value)}
          placeholder="ABC1234 ou ABC1D23"
          maxLength={8}
        />
        <button type="submit" disabled={isSearching}>
          {isSearching ? "Buscando..." : "Buscar"}
        </button>
      </form>
      <p className={styles.hint}>
        Digite a placa de um veículo já cadastrado para ver o histórico de
        permanências.
      </p>

      {status.type === "error" && (
        <p className={styles.errorMessage}>{status.message}</p>
      )}

      {status.type === "success" && status.stays.length === 0 && (
        <p className={styles.empty}>
          Nenhuma permanência registrada para {status.plate}.
        </p>
      )}

      {status.type === "success" && status.stays.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Duração</th>
            </tr>
          </thead>
          <tbody>
            {status.stays.map((stay) => (
              <tr key={stay.id}>
                <td>{new Date(stay.entry_time).toLocaleString("pt-BR")}</td>
                <td>
                  {stay.exit_time ? (
                    new Date(stay.exit_time).toLocaleString("pt-BR")
                  ) : (
                    <span className={styles.openBadge}>Em aberto</span>
                  )}
                </td>
                <td>
                  {stay.duration_in_seconds != null
                    ? formatElapsedTime(stay.duration_in_seconds)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
