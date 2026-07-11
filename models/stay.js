import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors";

async function create(vehicleId) {
  await validateVehicleNotParked(vehicleId);

  const newStay = await runInsertQuery(vehicleId);
  return newStay;

  async function runInsertQuery(vehicleId) {
    const results = await database.query({
      text: `
        INSERT INTO stays (vehicle_id)
        VALUES ($1)
        RETURNING *
        ;
        `,
      values: [vehicleId],
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

async function close(vehicleId) {
  const openStay = await findOpenByVehicleId(vehicleId);
  const closedStay = await runUpdateQuery(openStay.id);

  return {
    ...closedStay,
    duration_in_seconds: calculateDurationInSeconds(closedStay),
  };

  async function runUpdateQuery(stayId) {
    const results = await database.query({
      text: `
        UPDATE stays
        SET
          exit_time = timezone('utc', now()),
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING *
        ;
        `,
      values: [stayId],
    });
    return results.rows[0];
  }
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
      action: "Verifique se o veículo está estacionado antes de registrar a saída.",
    });
  }
  return results.rows[0];
}

function calculateDurationInSeconds(stay) {
  const elapsedMilliseconds = new Date(stay.exit_time) - new Date(stay.entry_time);
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

const stay = {
  create,
  close,
  findAllParked,
  findAllByVehicleId,
};

export default stay;
