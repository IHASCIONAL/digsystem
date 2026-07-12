import database from "infra/database.js";
import password from "models/password.js";
import authorization from "models/authorization.js";
import settings from "models/settings.js";
import { ValidationError } from "infra/errors.js";

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const DAILY_STAYS_WINDOW_IN_DAYS = 30;

async function getSummary() {
  const [
    totalVehicles,
    currentlyParked,
    revenue,
    peakHours,
    busiestWeekdays,
    dailyStays,
    collaboratorActivity,
  ] = await Promise.all([
    countTotalVehicles(),
    countCurrentlyParked(),
    getRevenueSummary(),
    getPeakHours(),
    getBusiestWeekdays(),
    getDailyStays(),
    getCollaboratorActivity(),
  ]);

  return {
    total_vehicles: totalVehicles,
    currently_parked: currentlyParked,
    revenue,
    peak_hours: peakHours,
    busiest_weekdays: busiestWeekdays,
    daily_stays: dailyStays,
    collaborator_activity: collaboratorActivity,
  };
}

async function getRevenueSummary() {
  const [totalResult, todayResult] = await Promise.all([
    database.query(`
      SELECT COALESCE(SUM(price_cents), 0)::int AS total
      FROM stays
      WHERE exit_time IS NOT NULL
      ;
    `),
    database.query(`
      SELECT COALESCE(SUM(price_cents), 0)::int AS total
      FROM stays
      WHERE exit_time IS NOT NULL AND DATE(exit_time) = CURRENT_DATE
      ;
    `),
  ]);

  return {
    total_cents: totalResult.rows[0].total,
    today_cents: todayResult.rows[0].total,
  };
}

async function countTotalVehicles() {
  const results = await database.query(
    "SELECT COUNT(*)::int AS count FROM vehicles;",
  );
  return results.rows[0].count;
}

async function countCurrentlyParked() {
  const results = await database.query(
    "SELECT COUNT(*)::int AS count FROM stays WHERE exit_time IS NULL;",
  );
  return results.rows[0].count;
}

async function getPeakHours(date) {
  if (date) {
    validateDate(date);
  }

  const results = await database.query(
    date
      ? {
          text: `
            SELECT
              EXTRACT(HOUR FROM entry_time)::int AS hour,
              COUNT(*)::int AS count
            FROM stays
            WHERE DATE(entry_time) = $1::date
            GROUP BY hour
            ;
          `,
          values: [date],
        }
      : `
        SELECT
          EXTRACT(HOUR FROM entry_time)::int AS hour,
          COUNT(*)::int AS count
        FROM stays
        GROUP BY hour
        ;
      `,
  );

  const countByHour = new Map(results.rows.map((row) => [row.hour, row.count]));

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: countByHour.get(hour) || 0,
  }));
}

function validateDate(date) {
  if (!DATE_FORMAT_REGEX.test(date) || Number.isNaN(Date.parse(date))) {
    throw new ValidationError({
      message: "A data informada não é válida.",
      action: "Informe uma data no formato AAAA-MM-DD.",
    });
  }
}

async function getBusiestWeekdays() {
  const results = await database.query(`
    SELECT
      EXTRACT(DOW FROM entry_time)::int AS weekday,
      COUNT(*)::int AS count
    FROM stays
    GROUP BY weekday
    ;
  `);

  const countByWeekday = new Map(
    results.rows.map((row) => [row.weekday, row.count]),
  );

  return WEEKDAY_LABELS.map((label, weekday) => ({
    weekday,
    label,
    count: countByWeekday.get(weekday) || 0,
  }));
}

async function getDailyStays() {
  const results = await database.query(`
    SELECT
      DATE(entry_time) AS date,
      COUNT(*)::int AS count
    FROM stays
    WHERE entry_time >= NOW() - INTERVAL '${DAILY_STAYS_WINDOW_IN_DAYS} days'
    GROUP BY date
    ;
  `);

  const countByDate = new Map(
    results.rows.map((row) => [toDateKey(row.date), row.count]),
  );

  const days = [];
  for (let offset = DAILY_STAYS_WINDOW_IN_DAYS - 1; offset >= 0; offset--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    const dateKey = toDateKey(date);
    days.push({ date: dateKey, count: countByDate.get(dateKey) || 0 });
  }
  return days;
}

function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

async function getCollaboratorActivity() {
  const [vehiclesByUser, checkInsByUser, checkOutsByUser, revenueByUser] =
    await Promise.all([
      database.query(`
      SELECT created_by AS user_id, COUNT(*)::int AS count
      FROM vehicles
      WHERE created_by IS NOT NULL
      GROUP BY created_by
      ;
    `),
      database.query(`
      SELECT checked_in_by AS user_id, COUNT(*)::int AS count
      FROM stays
      WHERE checked_in_by IS NOT NULL
      GROUP BY checked_in_by
      ;
    `),
      database.query(`
      SELECT checked_out_by AS user_id, COUNT(*)::int AS count
      FROM stays
      WHERE checked_out_by IS NOT NULL
      GROUP BY checked_out_by
      ;
    `),
      database.query(`
      SELECT checked_out_by AS user_id, COALESCE(SUM(price_cents), 0)::int AS count
      FROM stays
      WHERE checked_out_by IS NOT NULL AND exit_time IS NOT NULL
      GROUP BY checked_out_by
      ;
    `),
    ]);

  const activityByUserId = new Map();

  function addCounts(rows, field) {
    for (const row of rows) {
      const current = activityByUserId.get(row.user_id) || {
        vehicles_registered: 0,
        check_ins: 0,
        check_outs: 0,
        revenue_cents: 0,
      };
      current[field] = row.count;
      activityByUserId.set(row.user_id, current);
    }
  }

  addCounts(vehiclesByUser.rows, "vehicles_registered");
  addCounts(checkInsByUser.rows, "check_ins");
  addCounts(checkOutsByUser.rows, "check_outs");
  addCounts(revenueByUser.rows, "revenue_cents");

  const userIds = Array.from(activityByUserId.keys());
  if (userIds.length === 0) {
    return [];
  }

  const usersResult = await database.query({
    text: `SELECT id, username FROM users WHERE id = ANY($1::uuid[]);`,
    values: [userIds],
  });
  const usernameByUserId = new Map(
    usersResult.rows.map((row) => [row.id, row.username]),
  );

  return userIds
    .map((userId) => ({
      user_id: userId,
      username: usernameByUserId.get(userId) || null,
      ...activityByUserId.get(userId),
    }))
    .sort((a, b) => b.vehicles_registered - a.vehicles_registered);
}

const SEED_VEHICLE_COUNT = 20;
const SEED_COLLABORATOR_NAMES = ["ana", "bruno", "carla", "diego"];

async function seedDevelopmentData(triggeredBy) {
  const [fakeCollaboratorIds, ratePer12hCents] = await Promise.all([
    createFakeCollaborators(),
    settings.getRatePer12hCents(),
  ]);
  const actorPool = [triggeredBy, ...fakeCollaboratorIds];

  await database.query({
    text: `
      WITH new_vehicles AS (
        INSERT INTO vehicles (plate, created_by)
        SELECT
          'DV' || UPPER(SUBSTR(MD5(RANDOM()::text || seq::text), 1, 5)),
          ($1::uuid[])[1 + FLOOR(RANDOM() * ARRAY_LENGTH($1::uuid[], 1))::int]
        FROM generate_series(1, ${SEED_VEHICLE_COUNT}) AS seq
        RETURNING id
      ),
      new_stays AS (
        SELECT
          id AS vehicle_id,
          NOW()
            - (RANDOM() * 29 || ' days')::interval
            - (RANDOM() * 23 || ' hours')::interval AS entry_time,
          RANDOM() < 0.85 AS should_close,
          (RANDOM() * 30 || ' hours')::interval AS stay_duration,
          ($1::uuid[])[1 + FLOOR(RANDOM() * ARRAY_LENGTH($1::uuid[], 1))::int] AS check_in_actor,
          ($1::uuid[])[1 + FLOOR(RANDOM() * ARRAY_LENGTH($1::uuid[], 1))::int] AS check_out_actor
        FROM new_vehicles
      )
      INSERT INTO stays (vehicle_id, entry_time, exit_time, checked_in_by, checked_out_by, rate_cents, price_cents)
      SELECT
        vehicle_id,
        entry_time,
        CASE WHEN should_close THEN entry_time + stay_duration ELSE NULL END,
        check_in_actor,
        CASE WHEN should_close THEN check_out_actor ELSE NULL END,
        $2::int,
        CASE
          WHEN should_close THEN
            GREATEST(1, CEIL(EXTRACT(EPOCH FROM stay_duration) / 43200.0))::int * $2::int
          ELSE NULL
        END
      FROM new_stays
      ;
    `,
    values: [actorPool, ratePer12hCents],
  });
}

async function createFakeCollaborators() {
  const hashedPassword = await password.hash("dev-seed-not-a-real-login");

  const results = await database.query({
    text: `
      INSERT INTO users (username, password, features)
      SELECT
        'dev_' || name || '_' || SUBSTR(MD5(RANDOM()::text), 1, 4),
        $1,
        $2::varchar[]
      FROM UNNEST($3::text[]) AS name
      RETURNING id
      ;
    `,
    values: [
      hashedPassword,
      authorization.collaboratorFeatures,
      SEED_COLLABORATOR_NAMES,
    ],
  });

  return results.rows.map((row) => row.id);
}

const dashboard = {
  getSummary,
  getPeakHours,
  seedDevelopmentData,
};

export default dashboard;
