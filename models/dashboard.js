import database from "infra/database.js";

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
    peakHours,
    busiestWeekdays,
    dailyStays,
    collaboratorActivity,
  ] = await Promise.all([
    countTotalVehicles(),
    countCurrentlyParked(),
    getPeakHours(),
    getBusiestWeekdays(),
    getDailyStays(),
    getCollaboratorActivity(),
  ]);

  return {
    total_vehicles: totalVehicles,
    currently_parked: currentlyParked,
    peak_hours: peakHours,
    busiest_weekdays: busiestWeekdays,
    daily_stays: dailyStays,
    collaborator_activity: collaboratorActivity,
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

async function getPeakHours() {
  const results = await database.query(`
    SELECT
      EXTRACT(HOUR FROM entry_time)::int AS hour,
      COUNT(*)::int AS count
    FROM stays
    GROUP BY hour
    ;
  `);

  const countByHour = new Map(results.rows.map((row) => [row.hour, row.count]));

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: countByHour.get(hour) || 0,
  }));
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
  const [vehiclesByUser, checkInsByUser, checkOutsByUser] = await Promise.all([
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
  ]);

  const activityByUserId = new Map();

  function addCounts(rows, field) {
    for (const row of rows) {
      const current = activityByUserId.get(row.user_id) || {
        vehicles_registered: 0,
        check_ins: 0,
        check_outs: 0,
      };
      current[field] = row.count;
      activityByUserId.set(row.user_id, current);
    }
  }

  addCounts(vehiclesByUser.rows, "vehicles_registered");
  addCounts(checkInsByUser.rows, "check_ins");
  addCounts(checkOutsByUser.rows, "check_outs");

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

const dashboard = {
  getSummary,
};

export default dashboard;
