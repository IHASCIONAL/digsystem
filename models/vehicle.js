import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors";

const PLATE_FORMAT_REGEX = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

async function create(vehicleInputValues) {
  normalizePlateInObject(vehicleInputValues);
  validatePlateFormat(vehicleInputValues.plate);
  await validateUniquePlate(vehicleInputValues.plate);

  const newVehicle = await runInsertQuery(vehicleInputValues);
  return newVehicle;

  async function runInsertQuery(vehicleInputValues) {
    const results = await database.query({
      text: `
        INSERT INTO vehicles (plate, model, brand, color, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        ;
        `,
      values: [
        vehicleInputValues.plate,
        vehicleInputValues.model,
        vehicleInputValues.brand,
        vehicleInputValues.color,
        vehicleInputValues.notes,
      ],
    });
    return results.rows[0];
  }
}

async function findOneByPlate(plate) {
  const vehicleFound = await runSelectQuery(plate);

  return vehicleFound;

  async function runSelectQuery(plate) {
    const results = await database.query({
      text: `
        SELECT
          *
        FROM
          vehicles
        WHERE
          UPPER(plate) = UPPER($1)
        LIMIT 1
        ;
        `,
      values: [plate],
    });
    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "A placa informada não foi encontrada no sistema.",
        action: "Verifique se a placa está digitada corretamente.",
      });
    }
    return results.rows[0];
  }
}

async function validateUniquePlate(plate) {
  const results = await database.query({
    text: `
      SELECT
        plate
      FROM
        vehicles
      WHERE
        UPPER(plate) = UPPER($1)
      ;
      `,
    values: [plate],
  });
  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "A placa informada já está cadastrada.",
      action:
        "Verifique se a placa está correta ou consulte o veículo já existente.",
    });
  }
}

function normalizePlateInObject(vehicleInputValues) {
  vehicleInputValues.plate = vehicleInputValues.plate.trim().toUpperCase();
}

function validatePlateFormat(plate) {
  if (!PLATE_FORMAT_REGEX.test(plate)) {
    throw new ValidationError({
      message: "A placa informada não é válida.",
      action:
        "Informe uma placa no formato antigo (ABC1234) ou Mercosul (ABC1D23).",
    });
  }
}

const vehicle = {
  create,
  findOneByPlate,
};

export default vehicle;
