import useSWR from "swr";
import Link from "next/link";
import styles from "./index.module.css";

async function fetchAPI(key) {
  const response = await fetch(key);
  return response.json();
}

export default function VehicleListPage() {
  const { isLoading, data } = useSWR("/api/v1/vehicles", fetchAPI);

  return (
    <div className={styles.container}>
      <h1>Veículos cadastrados</h1>

      {isLoading && <p>Carregando...</p>}

      {!isLoading && data?.length === 0 && (
        <p className={styles.empty}>Nenhum veículo cadastrado.</p>
      )}

      {!isLoading && data?.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Placa</th>
              <th>Responsável</th>
              <th>Modelo</th>
              <th>Marca</th>
              <th>Cor</th>
              <th>Cadastrado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((registeredVehicle) => (
              <tr key={registeredVehicle.id}>
                <td>{registeredVehicle.plate}</td>
                <td>{registeredVehicle.owner_name || "—"}</td>
                <td>{registeredVehicle.model || "—"}</td>
                <td>{registeredVehicle.brand || "—"}</td>
                <td>{registeredVehicle.color || "—"}</td>
                <td>
                  {new Date(registeredVehicle.created_at).toLocaleDateString(
                    "pt-BR",
                  )}
                </td>
                <td>
                  <Link
                    href={`/veiculos/editar/${registeredVehicle.plate}`}
                    className={styles.editLink}
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
