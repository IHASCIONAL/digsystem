import Link from "next/link";
import { useCurrentUser } from "lib/useCurrentUser.js";
import styles from "./index.module.css";

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
];

export default function HomePage() {
  const { user } = useCurrentUser();
  const isAdmin = user?.features?.includes("create:user");
  const screens = isAdmin ? [...SCREENS, ...ADMIN_SCREENS] : SCREENS;

  return (
    <div className={styles.container}>
      <h1>O que você precisa fazer?</h1>

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
