import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors";

const AUTO_CLOSE_AFTER_HOURS = 10;

async function checkIn(userId) {
  await autoCloseStaleShift(userId);
  await validateNoOpenShift(userId);

  const newShift = await runInsertQuery(userId);
  return newShift;

  async function runInsertQuery(userId) {
    const results = await database.query({
      text: `
        INSERT INTO shifts (user_id)
        VALUES ($1)
        RETURNING *
        ;
        `,
      values: [userId],
    });
    return results.rows[0];
  }
}

async function checkOut(userId) {
  await autoCloseStaleShift(userId);
  const openShift = await findOpenByUserId(userId);

  const results = await database.query({
    text: `
      UPDATE shifts
      SET
        check_out_time = timezone('utc', now()),
        auto_closed = false,
        updated_at = timezone('utc', now())
      WHERE
        id = $1
      RETURNING *
      ;
      `,
    values: [openShift.id],
  });
  return results.rows[0];
}

async function findCurrentByUserId(userId) {
  await autoCloseStaleShift(userId);

  const results = await runSelectQuery(userId);
  return results.rows[0] || null;

  async function runSelectQuery(userId) {
    return database.query({
      text: `
        SELECT
          *
        FROM
          shifts
        WHERE
          user_id = $1
          AND check_out_time IS NULL
        LIMIT 1
        ;
        `,
      values: [userId],
    });
  }
}

async function findOpenByUserId(userId) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        shifts
      WHERE
        user_id = $1
        AND check_out_time IS NULL
      LIMIT 1
      ;
      `,
    values: [userId],
  });
  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "Você não possui um expediente em aberto.",
      action: "Faça o check-in antes de registrar o check-out.",
    });
  }
  return results.rows[0];
}

async function validateNoOpenShift(userId) {
  const results = await database.query({
    text: `
      SELECT
        id
      FROM
        shifts
      WHERE
        user_id = $1
        AND check_out_time IS NULL
      LIMIT 1
      ;
      `,
    values: [userId],
  });
  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "Você já está com o expediente em aberto.",
      action: "Registre o check-out antes de um novo check-in.",
    });
  }
}

async function autoCloseStaleShift(userId) {
  await database.query({
    text: `
      UPDATE shifts
      SET
        check_out_time = check_in_time + INTERVAL '${AUTO_CLOSE_AFTER_HOURS} hours',
        auto_closed = true,
        updated_at = timezone('utc', now())
      WHERE
        user_id = $1
        AND check_out_time IS NULL
        AND check_in_time <= NOW() - INTERVAL '${AUTO_CLOSE_AFTER_HOURS} hours'
      ;
      `,
    values: [userId],
  });
}

const shift = {
  checkIn,
  checkOut,
  findCurrentByUserId,
  AUTO_CLOSE_AFTER_HOURS,
};

export default shift;
