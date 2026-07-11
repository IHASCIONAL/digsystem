import { useState } from "react";
import useSWR from "swr";
import { useCurrentUser } from "lib/useCurrentUser.js";
import styles from "./index.module.css";

const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

const CHART_WIDTH = 880;
const CHART_HEIGHT = 220;
const CHART_PADDING = { top: 10, right: 10, bottom: 24, left: 10 };
const BAR_MAX_THICKNESS = 24;
const BAR_RADIUS = 4;

async function fetchAPI(key) {
  const response = await fetch(key);
  return response.json();
}

export default function DashboardPage() {
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const {
    data,
    isLoading: isLoadingSummary,
    mutate,
  } = useSWR(
    user?.features?.includes("read:dashboard") ? "/api/v1/dashboard" : null,
    fetchAPI,
  );
  const [isSeeding, setIsSeeding] = useState(false);

  async function handleSeed() {
    setIsSeeding(true);
    await fetch("/api/v1/dashboard/seed", { method: "POST" });
    await mutate();
    setIsSeeding(false);
  }

  if (isLoadingUser) {
    return (
      <div className={styles.container}>
        <h1>Dashboard</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user?.features?.includes("read:dashboard")) {
    return (
      <div className={styles.container}>
        <h1>Dashboard</h1>
        <p className={styles.errorMessage}>
          Acesso restrito a administradores.
        </p>
      </div>
    );
  }

  if (isLoadingSummary || !data) {
    return (
      <div className={styles.container}>
        <h1>Dashboard</h1>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Dashboard</h1>

      {IS_DEVELOPMENT && (
        <button
          type="button"
          onClick={handleSeed}
          disabled={isSeeding}
          className={styles.seedButton}
        >
          {isSeeding ? "Gerando..." : "Gerar dados de teste (dev)"}
        </button>
      )}

      <div className={styles.statRow}>
        <StatTile label="Veículos cadastrados" value={data.total_vehicles} />
        <StatTile label="Estacionados agora" value={data.currently_parked} />
      </div>

      <div className={styles.chartCard}>
        <h2>Horários de pico</h2>
        <BarChart
          data={data.peak_hours.map((entry) => ({
            label: String(entry.hour),
            value: entry.count,
          }))}
          showLabelEvery={3}
        />
      </div>

      <div className={styles.chartCard}>
        <h2>Melhores dias da semana</h2>
        <BarChart
          data={data.busiest_weekdays.map((entry) => ({
            label: entry.label.slice(0, 3),
            value: entry.count,
          }))}
          showLabelEvery={1}
        />
      </div>

      <div className={styles.chartCard}>
        <h2>Entradas nos últimos 30 dias</h2>
        <LineChart
          data={data.daily_stays.map((entry) => ({
            label: entry.date,
            value: entry.count,
          }))}
        />
      </div>

      <div className={styles.chartCard}>
        <h2>Atividade por colaborador</h2>
        {data.collaborator_activity.length === 0 ? (
          <p className={styles.empty}>Nenhuma atividade registrada ainda.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Veículos cadastrados</th>
                <th>Check-ins</th>
                <th>Check-outs</th>
              </tr>
            </thead>
            <tbody>
              {data.collaborator_activity.map((activity) => (
                <tr key={activity.user_id}>
                  <td>{activity.username || "—"}</td>
                  <td>{activity.vehicles_registered}</td>
                  <td>{activity.check_ins}</td>
                  <td>{activity.check_outs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className={styles.statTile}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

function BarChart({ data, showLabelEvery }) {
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const baselineY = CHART_PADDING.top + plotHeight;

  const maxValue = Math.max(1, ...data.map((entry) => entry.value));
  const slotWidth = plotWidth / data.length;
  const barWidth = Math.min(BAR_MAX_THICKNESS, slotWidth * 0.6);

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label="Gráfico de barras"
    >
      <line
        className={styles.gridline}
        x1={CHART_PADDING.left}
        y1={baselineY}
        x2={CHART_WIDTH - CHART_PADDING.right}
        y2={baselineY}
      />
      {data.map((entry, index) => {
        const barHeight =
          maxValue === 0 ? 0 : (entry.value / maxValue) * plotHeight;
        const slotCenter =
          CHART_PADDING.left + slotWidth * index + slotWidth / 2;
        const x = slotCenter - barWidth / 2;
        const y = baselineY - barHeight;

        return (
          <g key={entry.label}>
            <path
              className={styles.bar}
              d={roundedTopBarPath(x, y, barWidth, barHeight, BAR_RADIUS)}
            >
              <title>{`${entry.label}: ${entry.value}`}</title>
            </path>
            {index % showLabelEvery === 0 && (
              <text
                className={styles.axisLabel}
                x={slotCenter}
                y={baselineY + 14}
                textAnchor="middle"
              >
                {entry.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data }) {
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const baselineY = CHART_PADDING.top + plotHeight;

  const maxValue = Math.max(1, ...data.map((entry) => entry.value));
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const points = data.map((entry, index) => ({
    x: CHART_PADDING.left + stepX * index,
    y: baselineY - (entry.value / maxValue) * plotHeight,
    ...entry,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L${points[points.length - 1].x},${baselineY} L${points[0].x},${baselineY} Z`;

  const labelIndexes = new Set([
    0,
    Math.floor((points.length - 1) / 2),
    points.length - 1,
  ]);

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label="Gráfico de linha"
    >
      <line
        className={styles.gridline}
        x1={CHART_PADDING.left}
        y1={baselineY}
        x2={CHART_WIDTH - CHART_PADDING.right}
        y2={baselineY}
      />
      <path className={styles.areaFill} d={areaPath} />
      <path className={styles.line} d={linePath} />
      {points.map((point, index) => (
        <g key={point.label}>
          <circle className={styles.point} cx={point.x} cy={point.y} r={4}>
            <title>{`${point.label}: ${point.value}`}</title>
          </circle>
          {labelIndexes.has(index) && (
            <text
              className={styles.axisLabel}
              x={point.x}
              y={baselineY + 14}
              textAnchor={
                index === 0
                  ? "start"
                  : index === points.length - 1
                    ? "end"
                    : "middle"
              }
            >
              {formatShortDate(point.label)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function roundedTopBarPath(x, y, width, height, radius) {
  if (height <= 0) {
    return "";
  }
  const appliedRadius = Math.min(radius, width / 2, height);

  return `
    M${x},${y + height}
    L${x},${y + appliedRadius}
    Q${x},${y} ${x + appliedRadius},${y}
    L${x + width - appliedRadius},${y}
    Q${x + width},${y} ${x + width},${y + appliedRadius}
    L${x + width},${y + height}
    Z
  `;
}

function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}
