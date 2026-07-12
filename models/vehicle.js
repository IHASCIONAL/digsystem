import database from "infra/database.js";
import { ValidationError, NotFoundError } from "infra/errors";

const PLATE_FORMAT_REGEX = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

async function create(vehicleInputValues, createdBy) {
  normalizePlateInObject(vehicleInputValues);
  validatePlateFormat(vehicleInputValues.plate);
  await validateUniquePlate(vehicleInputValues.plate);

  const newVehicle = await runInsertQuery(vehicleInputValues, createdBy);
  return newVehicle;

  async function runInsertQuery(vehicleInputValues, createdBy) {
    const results = await database.query({
      text: `
        INSERT INTO vehicles (plate, model, brand, color, notes, owner_name, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        ;
        `,
      values: [
        vehicleInputValues.plate,
        vehicleInputValues.model,
        vehicleInputValues.brand,
        vehicleInputValues.color,
        vehicleInputValues.notes,
        vehicleInputValues.owner_name,
        createdBy,
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

async function findAll() {
  const results = await runSelectQuery();
  return results.rows;

  async function runSelectQuery() {
    return database.query({
      text: `
        SELECT
          *
        FROM
          vehicles
        ORDER BY
          plate ASC
        ;
        `,
    });
  }
}

async function update(plate, vehicleInputValues) {
  const currentVehicle = await findOneByPlate(plate);

  if ("plate" in vehicleInputValues) {
    normalizePlateInObject(vehicleInputValues);

    if (vehicleInputValues.plate !== currentVehicle.plate) {
      validatePlateFormat(vehicleInputValues.plate);
      await validateUniquePlate(vehicleInputValues.plate);
    }
  }

  const vehicleWithNewValues = { ...currentVehicle, ...vehicleInputValues };
  const updatedVehicle = await runUpdateQuery(vehicleWithNewValues);
  return updatedVehicle;

  async function runUpdateQuery(vehicleWithNewValues) {
    const results = await database.query({
      text: `
        UPDATE vehicles
        SET
          plate = $2,
          owner_name = $3,
          model = $4,
          brand = $5,
          color = $6,
          notes = $7,
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING *
        ;
        `,
      values: [
        vehicleWithNewValues.id,
        vehicleWithNewValues.plate,
        vehicleWithNewValues.owner_name,
        vehicleWithNewValues.model,
        vehicleWithNewValues.brand,
        vehicleWithNewValues.color,
        vehicleWithNewValues.notes,
      ],
    });
    return results.rows[0];
  }
}

async function remove(plate) {
  const vehicleToDelete = await findOneByPlate(plate);

  await validateNoStays(vehicleToDelete.id);

  await database.query({
    text: `DELETE FROM vehicles WHERE id = $1;`,
    values: [vehicleToDelete.id],
  });

  return vehicleToDelete;
}

async function validateNoStays(vehicleId) {
  const results = await database.query({
    text: `SELECT id FROM stays WHERE vehicle_id = $1 LIMIT 1;`,
    values: [vehicleId],
  });
  if (results.rowCount > 0) {
    throw new ValidationError({
      message:
        "Não é possível excluir um veículo com permanências registradas.",
      action:
        "Veículos com histórico de entradas e saídas não podem ser removidos do cadastro.",
    });
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
  findAll,
  findOneByPlate,
  update,
  remove,
};

export default vehicle;
