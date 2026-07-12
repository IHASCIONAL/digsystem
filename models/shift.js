import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors";

const AUTO_CLOSE_AFTER_HOURS = 10;

async function checkIn(userId) {
  await autoCloseStaleShift(userId);
  await validateNoOpenShift(userId);
  await validateNoShiftToday(userId);

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

async function validateNoShiftToday(userId) {
  const results = await database.query({
    text: `
      SELECT
        id
      FROM
        shifts
      WHERE
        user_id = $1
        AND DATE(check_in_time) = CURRENT_DATE
      LIMIT 1
      ;
      `,
    values: [userId],
  });
  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "Você já fez check-in hoje.",
      action: "Um novo check-in só pode ser feito amanhã.",
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

async function findAll() {
  const results = await database.query(`
    SELECT
      shifts.*,
      collaborator.username AS collaborator_username,
      editor.username AS edited_by_username
    FROM shifts
    INNER JOIN users AS collaborator ON collaborator.id = shifts.user_id
    LEFT JOIN users AS editor ON editor.id = shifts.edited_by
    ORDER BY
      shifts.check_in_time DESC
    ;
  `);
  return results.rows;
}

async function findOneById(shiftId) {
  const results = await database.query({
    text: `
      SELECT
        shifts.*,
        collaborator.username AS collaborator_username,
        editor.username AS edited_by_username
      FROM shifts
      INNER JOIN users AS collaborator ON collaborator.id = shifts.user_id
      LEFT JOIN users AS editor ON editor.id = shifts.edited_by
      WHERE shifts.id = $1
      LIMIT 1
      ;
      `,
    values: [shiftId],
  });
  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O expediente informado não foi encontrado no sistema.",
      action: "Verifique se o identificador está correto.",
    });
  }
  return results.rows[0];
}

async function adminUpdate(shiftId, updates, editedBy) {
  const existingShift = await findOneById(shiftId);

  const checkInTime =
    updates.check_in_time !== undefined
      ? updates.check_in_time
      : existingShift.check_in_time;
  const checkOutTime =
    updates.check_out_time !== undefined
      ? updates.check_out_time
      : existingShift.check_out_time;

  validateAdminUpdate({ checkInTime, checkOutTime });

  const results = await database.query({
    text: `
      UPDATE shifts
      SET
        check_in_time = $2,
        check_out_time = $3,
        auto_closed = false,
        edited_by = $4,
        edited_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        id = $1
      RETURNING *
      ;
      `,
    values: [shiftId, checkInTime, checkOutTime, editedBy],
  });
  return results.rows[0];
}

function validateAdminUpdate({ checkInTime, checkOutTime }) {
  if (!checkInTime || Number.isNaN(Date.parse(checkInTime))) {
    throw new ValidationError({
      message: "A data/hora de check-in informada não é válida.",
      action: "Informe uma data/hora de check-in válida.",
    });
  }

  if (checkOutTime) {
    if (Number.isNaN(Date.parse(checkOutTime))) {
      throw new ValidationError({
        message: "A data/hora de check-out informada não é válida.",
        action: "Informe uma data/hora de check-out válida.",
      });
    }

    if (new Date(checkOutTime) <= new Date(checkInTime)) {
      throw new ValidationError({
        message: "O check-out deve ser depois do check-in.",
        action: "Ajuste os horários informados.",
      });
    }
  }
}

const shift = {
  checkIn,
  checkOut,
  findCurrentByUserId,
  findAll,
  findOneById,
  adminUpdate,
  AUTO_CLOSE_AFTER_HOURS,
};

export default shift;
