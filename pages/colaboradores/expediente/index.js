import Link from "next/link";
import useSWR from "swr";
import { useCurrentUser } from "lib/useCurrentUser.js";
import { formatElapsedTime } from "lib/formatElapsedTime.js";
import styles from "./index.module.css";

async function fetchAPI(key) {
  const response = await fetch(key);
  return response.json();
}

export default function ShiftHistoryPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const canAccess = user?.features?.includes("read:shift:all");

  const { data, isLoading } = useSWR(
    canAccess ? "/api/v1/shifts/all" : null,
    fetchAPI,
  );

  if (isLoadingUser) {
    return (
      <div className={styles.container}>
        <h1>Expediente da equipe</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className={styles.container}>
        <h1>Expediente da equipe</h1>
        <p className={styles.errorMessage}>
          Acesso restrito a administradores.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Expediente da equipe</h1>
      <p className={styles.hint}>
        Check-ins e check-outs de expediente de todos os colaboradores.
      </p>

      {isLoading && <p>Carregando...</p>}

      {!isLoading && data?.length === 0 && (
        <p className={styles.empty}>Nenhum expediente registrado ainda.</p>
      )}

      {!isLoading && data?.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Duração</th>
              <th>Origem</th>
              <th>Editado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((shift) => {
              const durationInSeconds = shift.check_out_time
                ? Math.round(
                    (new Date(shift.check_out_time) -
                      new Date(shift.check_in_time)) /
                      1000,
                  )
                : null;

              return (
                <tr key={shift.id}>
                  <td>{shift.collaborator_username}</td>
                  <td>
                    {new Date(shift.check_in_time).toLocaleString("pt-BR")}
                  </td>
                  <td>
                    {shift.check_out_time ? (
                      new Date(shift.check_out_time).toLocaleString("pt-BR")
                    ) : (
                      <span className={styles.openBadge}>Em aberto</span>
                    )}
                  </td>
                  <td>
                    {durationInSeconds != null
                      ? formatElapsedTime(durationInSeconds)
                      : "—"}
                  </td>
                  <td>
                    {shift.auto_closed ? (
                      <span className={styles.autoClosedBadge}>
                        Encerrado automaticamente
                      </span>
                    ) : (
                      "Manual"
                    )}
                  </td>
                  <td>
                    {shift.edited_by_username ? (
                      <span className={styles.editedBadge}>
                        {shift.edited_by_username}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/colaboradores/expediente/editar/${shift.id}`}
                      className={styles.editLink}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
