import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useCurrentUser } from "lib/useCurrentUser.js";
import { formatElapsedTime } from "lib/formatElapsedTime.js";
import { formatCentsAsCurrency } from "lib/formatCurrency.js";
import styles from "./index.module.css";

async function fetchAPI(key) {
  const response = await fetch(key);
  return response.json();
}

export default function VehicleFullHistoryPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const canAccess = user?.features?.includes("read:stay:all");

  const query = new URLSearchParams();
  if (startDate) query.set("start", startDate);
  if (endDate) query.set("end", endDate);
  const queryString = query.toString();

  const { data, isLoading, error } = useSWR(
    canAccess
      ? `/api/v1/stays/history${queryString ? `?${queryString}` : ""}`
      : null,
    fetchAPI,
  );

  if (isLoadingUser) {
    return (
      <div className={styles.container}>
        <h1>Histórico completo</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className={styles.container}>
        <h1>Histórico completo</h1>
        <p className={styles.errorMessage}>
          Acesso restrito a administradores.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Histórico completo</h1>
      <p className={styles.hint}>
        Todas as permanências de todos os veículos, com quem registrou a entrada
        e a saída.
      </p>

      <div className={styles.filterRow}>
        <label className={styles.field}>
          De
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          Até
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        {(startDate || endDate) && (
          <button
            type="button"
            className={styles.clearFilterButton}
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Limpar filtro
          </button>
        )}
      </div>

      {isLoading && <p>Carregando...</p>}

      {error && (
        <p className={styles.errorMessage}>
          Não foi possível carregar o histórico.
        </p>
      )}

      {!isLoading && data?.length === 0 && (
        <p className={styles.empty}>
          Nenhuma permanência encontrada no período selecionado.
        </p>
      )}

      {!isLoading && data?.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Placa</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Duração</th>
              <th>Valor</th>
              <th>Check-in por</th>
              <th>Check-out por</th>
              <th>Editado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((stay) => (
              <tr key={stay.id}>
                <td>{stay.plate}</td>
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
                <td>
                  {stay.price_cents != null
                    ? formatCentsAsCurrency(stay.price_cents)
                    : "—"}
                </td>
                <td>{stay.checked_in_by_username || "—"}</td>
                <td>{stay.checked_out_by_username || "—"}</td>
                <td>
                  {stay.edited_by_username ? (
                    <span className={styles.editedBadge}>
                      {stay.edited_by_username}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <Link
                    href={`/veiculos/historico/editar/${stay.id}`}
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
