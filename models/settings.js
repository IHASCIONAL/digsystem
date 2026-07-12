import database from "infra/database.js";
import { ValidationError } from "infra/errors.js";

async function get() {
  const results = await database.query("SELECT * FROM settings WHERE id = 1;");
  return results.rows[0];
}

async function getRatePer12hCents() {
  const settings = await get();
  return settings.rate_per_12h_cents;
}

async function updateRatePer12hCents(ratePer12hCents) {
  validateRatePer12hCents(ratePer12hCents);

  const results = await database.query({
    text: `
      UPDATE settings
      SET
        rate_per_12h_cents = $1,
        updated_at = timezone('utc', now())
      WHERE
        id = 1
      RETURNING *
      ;
      `,
    values: [ratePer12hCents],
  });
  return results.rows[0];
}

function validateRatePer12hCents(ratePer12hCents) {
  if (!Number.isInteger(ratePer12hCents) || ratePer12hCents <= 0) {
    throw new ValidationError({
      message:
        "O valor cobrado a cada 12 horas deve ser um número inteiro positivo, em centavos.",
      action: "Informe um valor em centavos maior que zero.",
    });
  }
}

const settings = {
  get,
  getRatePer12hCents,
  updateRatePer12hCents,
};

export default settings;
