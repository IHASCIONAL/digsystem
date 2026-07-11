import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useCurrentUser } from "lib/useCurrentUser.js";
import { formatElapsedTime } from "lib/formatElapsedTime.js";
import styles from "./index.module.css";

async function fetchAPI(key) {
  const response = await fetch(key);
  return response.json();
}

const SCREENS = [
  {
    href: "/veiculos/cadastro",
    title: "Cadastro de veículo",
    description: "Cadastrar um novo veículo antes da primeira entrada.",
  },
  {
    href: "/veiculos/todos",
    title: "Veículos cadastrados",
    description: "Ver e editar os dados de qualquer veículo cadastrado.",
  },
  {
    href: "/veiculos/operacao",
    title: "Entrada e saída",
    description: "Registrar a entrada ou saída de um veículo pela placa.",
  },
  {
    href: "/veiculos",
    title: "Veículos presentes",
    description: "Lista em tempo real de quem está estacionado agora.",
  },
  {
    href: "/veiculos/historico",
    title: "Histórico",
    description: "Consultar as permanências passadas de um veículo.",
  },
];

const ADMIN_SCREENS = [
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Visão geral do estacionamento e atividade dos colaboradores.",
  },
  {
    href: "/colaboradores/cadastro",
    title: "Cadastro de colaborador",
    description: "Criar acesso para um novo colaborador.",
  },
  {
    href: "/colaboradores/todos",
    title: "Colaboradores cadastrados",
    description: "Ver e editar o perfil de qualquer colaborador.",
  },
];

export default function HomePage() {
  const { user } = useCurrentUser();
  const isAdmin = user?.features?.includes("create:user");
  const screens = isAdmin ? [...SCREENS, ...ADMIN_SCREENS] : SCREENS;

  return (
    <div className={styles.container}>
      <h1>O que você precisa fazer?</h1>

      {user?.features?.includes("create:shift") && <MyShift />}

      <div className={styles.list}>
        {screens.map((screen) => (
          <Link key={screen.href} href={screen.href} className={styles.card}>
            <div className={styles.cardTitle}>{screen.title}</div>
            <div className={styles.cardDescription}>{screen.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MyShift() {
  const { data, isLoading, mutate } = useSWR("/api/v1/shifts/me", fetchAPI, {
    refreshInterval: 30000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCheckIn() {
    setIsSubmitting(true);
    await fetch("/api/v1/shifts", { method: "POST" });
    await mutate();
    setIsSubmitting(false);
  }

  async function handleCheckOut() {
    setIsSubmitting(true);
    await fetch("/api/v1/shifts", { method: "PATCH" });
    await mutate();
    setIsSubmitting(false);
  }

  if (isLoading || !data) {
    return null;
  }

  const openShift = data.shift;

  return (
    <div className={styles.myShift}>
      {openShift ? (
        <>
          <span className={styles.myShiftStatus}>
            Expediente aberto desde{" "}
            {new Date(openShift.check_in_time).toLocaleTimeString("pt-BR")} (
            {formatElapsedTime(
              Math.round(
                (Date.now() - new Date(openShift.check_in_time).getTime()) /
                  1000,
              ),
            )}
            )
          </span>
          <button
            type="button"
            onClick={handleCheckOut}
            disabled={isSubmitting}
            className={styles.checkOutButton}
          >
            {isSubmitting ? "Registrando..." : "Fazer check-out"}
          </button>
        </>
      ) : (
        <>
          <span className={styles.myShiftStatus}>
            Você ainda não fez check-in hoje.
          </span>
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={isSubmitting}
            className={styles.checkInButton}
          >
            {isSubmitting ? "Registrando..." : "Fazer check-in"}
          </button>
        </>
      )}
    </div>
  );
}
