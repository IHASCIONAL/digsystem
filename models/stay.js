import database from "infra/database.js";
import { ValidationError } from "infra/errors";

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

const stay = {
  create,
};

export default stay;
