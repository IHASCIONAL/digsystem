import database from "infra/database.js";
import settings from "models/settings.js";
import { ValidationError, NotFoundError } from "infra/errors";

const BLOCK_DURATION_IN_SECONDS = 12 * 60 * 60;
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

async function create(vehicleId, checkedInBy) {
  await validateVehicleNotParked(vehicleId);

  const rateCents = await settings.getRatePer12hCents();
  const newStay = await runInsertQuery(vehicleId, checkedInBy, rateCents);
  return newStay;

  async function runInsertQuery(vehicleId, checkedInBy, rateCents) {
    const results = await database.query({
      text: `
        INSERT INTO stays (vehicle_id, checked_in_by, rate_cents)
        VALUES ($1, $2, $3)
        RETURNING *
        ;
        `,
      values: [vehicleId, checkedInBy, rateCents],
    });
    return results.rows[0];
  }
}

async function validateVehicleNotParked(vehicleId) {
  const results = await database.query({
    text: `
      SELECT
        id
      FROM
        stays
      WHERE
        vehicle_id = $1
        AND exit_time IS NULL
      LIMIT 1
      ;
      `,
    values: [vehicleId],
  });
  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O veículo já está estacionado.",
      action: "Registre a saída antes de uma nova entrada.",
    });
  }
}

async function close(vehicleId, checkedOutBy) {
  const openStay = await findOpenByVehicleId(vehicleId);

  const durationInSeconds = calculateDurationInSeconds({
    entry_time: openStay.entry_time,
    exit_time: new Date(),
  });
  const priceCents = calculatePriceCents(
    durationInSeconds,
    openStay.rate_cents,
  );

  const closedStay = await runUpdateQuery(
    openStay.id,
    checkedOutBy,
    priceCents,
  );

  return {
    ...closedStay,
    duration_in_seconds: calculateDurationInSeconds(closedStay),
  };

  async function runUpdateQuery(stayId, checkedOutBy, priceCents) {
    const results = await database.query({
      text: `
        UPDATE stays
        SET
          exit_time = timezone('utc', now()),
          checked_out_by = $2,
          price_cents = $3,
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING *
        ;
        `,
      values: [stayId, checkedOutBy, priceCents],
    });
    return results.rows[0];
  }
}

function calculatePriceCents(durationInSeconds, rateCents) {
  const blocks = Math.max(
    1,
    Math.ceil(durationInSeconds / BLOCK_DURATION_IN_SECONDS),
  );
  return blocks * rateCents;
}

async function findOpenByVehicleId(vehicleId) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        stays
      WHERE
        vehicle_id = $1
        AND exit_time IS NULL
      LIMIT 1
      ;
      `,
    values: [vehicleId],
  });
  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O veículo não possui uma permanência em aberto.",
      action:
        "Verifique se o veículo está estacionado antes de registrar a saída.",
    });
  }
  return results.rows[0];
}

function calculateDurationInSeconds(stay) {
  const elapsedMilliseconds =
    new Date(stay.exit_time) - new Date(stay.entry_time);
  return Math.round(elapsedMilliseconds / 1000);
}

async function findAllParked() {
  const results = await runSelectQuery();

  return results.rows.map((parkedStay) => ({
    ...parkedStay,
    elapsed_in_seconds: calculateElapsedInSeconds(parkedStay),
  }));

  async function runSelectQuery() {
    return database.query({
      text: `
        SELECT
          stays.id,
          stays.vehicle_id,
          vehicles.plate,
          vehicles.model,
          stays.entry_time
        FROM
          stays
        INNER JOIN
          vehicles ON vehicles.id = stays.vehicle_id
        WHERE
          stays.exit_time IS NULL
        ORDER BY
          stays.entry_time ASC
        ;
        `,
    });
  }
}

function calculateElapsedInSeconds(parkedStay) {
  const elapsedMilliseconds = new Date() - new Date(parkedStay.entry_time);
  return Math.round(elapsedMilliseconds / 1000);
}

async function findAllByVehicleId(vehicleId) {
  const results = await runSelectQuery(vehicleId);

  return results.rows.map((pastStay) => ({
    ...pastStay,
    duration_in_seconds: pastStay.exit_time
      ? calculateDurationInSeconds(pastStay)
      : null,
  }));

  async function runSelectQuery(vehicleId) {
    return database.query({
      text: `
        SELECT
          *
        FROM
          stays
        WHERE
          vehicle_id = $1
        ORDER BY
          entry_time DESC
        ;
        `,
      values: [vehicleId],
    });
  }
}

async function findOneById(stayId) {
  const results = await database.query({
    text: `
      SELECT
        stays.*,
        vehicles.plate,
        vehicles.model,
        checked_in_user.username AS checked_in_by_username,
        checked_out_user.username AS checked_out_by_username,
        editor.username AS edited_by_username
      FROM stays
      INNER JOIN vehicles ON vehicles.id = stays.vehicle_id
      LEFT JOIN users AS checked_in_user ON checked_in_user.id = stays.checked_in_by
      LEFT JOIN users AS checked_out_user ON checked_out_user.id = stays.checked_out_by
      LEFT JOIN users AS editor ON editor.id = stays.edited_by
      WHERE stays.id = $1
      LIMIT 1
      ;
      `,
    values: [stayId],
  });
  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "A permanência informada não foi encontrada no sistema.",
      action: "Verifique se o identificador está correto.",
    });
  }
  return results.rows[0];
}

async function findAllInRange(startDate, endDate) {
  if (startDate) validateDate(startDate);
  if (endDate) validateDate(endDate);

  const results = await runSelectQuery(startDate, endDate);

  return results.rows.map((pastStay) => ({
    ...pastStay,
    duration_in_seconds: pastStay.exit_time
      ? calculateDurationInSeconds(pastStay)
      : null,
  }));

  async function runSelectQuery(startDate, endDate) {
    return database.query({
      text: `
        SELECT
          stays.*,
          vehicles.plate,
          vehicles.model,
          checked_in_user.username AS checked_in_by_username,
          checked_out_user.username AS checked_out_by_username,
          editor.username AS edited_by_username
        FROM stays
        INNER JOIN vehicles ON vehicles.id = stays.vehicle_id
        LEFT JOIN users AS checked_in_user ON checked_in_user.id = stays.checked_in_by
        LEFT JOIN users AS checked_out_user ON checked_out_user.id = stays.checked_out_by
        LEFT JOIN users AS editor ON editor.id = stays.edited_by
        WHERE
          ($1::date IS NULL OR DATE(stays.entry_time) >= $1::date)
          AND ($2::date IS NULL OR DATE(stays.entry_time) <= $2::date)
        ORDER BY
          stays.entry_time DESC
        ;
        `,
      values: [startDate || null, endDate || null],
    });
  }
}

function validateDate(date) {
  if (!DATE_FORMAT_REGEX.test(date) || Number.isNaN(Date.parse(date))) {
    throw new ValidationError({
      message: "A data informada não é válida.",
      action: "Informe uma data no formato AAAA-MM-DD.",
    });
  }
}

async function adminUpdate(stayId, updates, editedBy) {
  const existingStay = await findOneById(stayId);

  const entryTime =
    updates.entry_time !== undefined
      ? updates.entry_time
      : existingStay.entry_time;
  const exitTime =
    updates.exit_time !== undefined
      ? updates.exit_time
      : existingStay.exit_time;
  const priceCents = exitTime
    ? updates.price_cents !== undefined
      ? updates.price_cents
      : existingStay.price_cents
    : null;

  validateAdminUpdate({ entryTime, exitTime, priceCents });

  const results = await database.query({
    text: `
      UPDATE stays
      SET
        entry_time = $2,
        exit_time = $3,
        price_cents = $4,
        edited_by = $5,
        edited_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        id = $1
      RETURNING *
      ;
      `,
    values: [stayId, entryTime, exitTime, priceCents, editedBy],
  });

  const updatedStay = results.rows[0];
  return {
    ...updatedStay,
    duration_in_seconds: updatedStay.exit_time
      ? calculateDurationInSeconds(updatedStay)
      : null,
  };
}

function validateAdminUpdate({ entryTime, exitTime, priceCents }) {
  if (!entryTime || Number.isNaN(Date.parse(entryTime))) {
    throw new ValidationError({
      message: "A data/hora de entrada informada não é válida.",
      action: "Informe uma data/hora de entrada válida.",
    });
  }

  if (exitTime) {
    if (Number.isNaN(Date.parse(exitTime))) {
      throw new ValidationError({
        message: "A data/hora de saída informada não é válida.",
        action: "Informe uma data/hora de saída válida.",
      });
    }

    if (new Date(exitTime) <= new Date(entryTime)) {
      throw new ValidationError({
        message: "A saída deve ser depois da entrada.",
        action: "Ajuste os horários informados.",
      });
    }

    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      throw new ValidationError({
        message:
          "O valor deve ser um número inteiro positivo, em centavos, quando há saída registrada.",
        action: "Informe um valor válido em centavos.",
      });
    }
  }
}

const stay = {
  create,
  close,
  findAllParked,
  findAllByVehicleId,
  findOneById,
  findAllInRange,
  adminUpdate,
};

export default stay;
