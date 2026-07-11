import useSWR from "swr";
import Link from "next/link";
import { useCurrentUser } from "lib/useCurrentUser.js";
import styles from "./index.module.css";

async function fetchAPI(key) {
  const response = await fetch(key);
  return response.json();
}

export default function CollaboratorListPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const { data, isLoading: isLoadingUsers } = useSWR(
    user?.features?.includes("read:user") ? "/api/v1/users" : null,
    fetchAPI,
  );

  if (isLoadingUser) {
    return (
      <div className={styles.container}>
        <h1>Colaboradores cadastrados</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user?.features?.includes("read:user")) {
    return (
      <div className={styles.container}>
        <h1>Colaboradores cadastrados</h1>
        <p className={styles.empty}>Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Colaboradores cadastrados</h1>

      {isLoadingUsers && <p>Carregando...</p>}

      {!isLoadingUsers && data?.length === 0 && (
        <p className={styles.empty}>Nenhum colaborador cadastrado.</p>
      )}

      {!isLoadingUsers && data?.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Nome completo</th>
              <th>Telefone</th>
              <th>Perfil</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((registeredUser) => {
              const isAdmin = registeredUser.features.includes("create:user");
              return (
                <tr key={registeredUser.id}>
                  <td>{registeredUser.username}</td>
                  <td>{registeredUser.full_name || "—"}</td>
                  <td>{registeredUser.phone || "—"}</td>
                  <td>
                    <span
                      className={`${styles.roleBadge} ${
                        isAdmin ? styles.roleAdmin : styles.roleCollaborator
                      }`}
                    >
                      {isAdmin ? "Admin" : "Colaborador"}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/colaboradores/editar/${registeredUser.username}`}
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
