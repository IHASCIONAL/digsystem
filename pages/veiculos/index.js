import useSWR from "swr";
import { formatElapsedTime } from "lib/formatElapsedTime.js";
import styles from "./index.module.css";

async function fetchAPI(key) {
  const response = await fetch(key);
  return response.json();
}

export default function ParkedVehiclesPage() {
  const { isLoading, data } = useSWR("/api/v1/stays", fetchAPI, {
    refreshInterval: 5000,
  });

  return (
    <div className={styles.container}>
      <h1>Veículos presentes</h1>

      {isLoading && <p>Carregando...</p>}

      {!isLoading && data?.length === 0 && (
        <p className={styles.empty}>Nenhum veículo estacionado no momento.</p>
      )}

      {!isLoading && data?.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Placa</th>
              <th>Modelo</th>
              <th>Entrada</th>
              <th>Tempo decorrido</th>
            </tr>
          </thead>
          <tbody>
            {data.map((parkedVehicle) => (
              <tr key={parkedVehicle.id}>
                <td>{parkedVehicle.plate}</td>
                <td>{parkedVehicle.model || "—"}</td>
                <td>
                  {new Date(parkedVehicle.entry_time).toLocaleString("pt-BR")}
                </td>
                <td>{formatElapsedTime(parkedVehicle.elapsed_in_seconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
