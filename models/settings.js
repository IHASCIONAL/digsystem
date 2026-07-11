import database from "infra/database.js";
import { ValidationError } from "infra/errors.js";

async function get() {
  const results = await database.query("SELECT * FROM settings WHERE id = 1;");
  return results.rows[0];
}

async function getDailyRateCents() {
  const settings = await get();
  return settings.daily_rate_cents;
}

async function updateDailyRateCents(dailyRateCents) {
  validateDailyRateCents(dailyRateCents);

  const results = await database.query({
    text: `
      UPDATE settings
      SET
        daily_rate_cents = $1,
        updated_at = timezone('utc', now())
      WHERE
        id = 1
      RETURNING *
      ;
      `,
    values: [dailyRateCents],
  });
  return results.rows[0];
}

function validateDailyRateCents(dailyRateCents) {
  if (!Number.isInteger(dailyRateCents) || dailyRateCents <= 0) {
    throw new ValidationError({
      message:
        "O valor da diária deve ser um número inteiro positivo, em centavos.",
      action: "Informe um valor em centavos maior que zero.",
    });
  }
}

const settings = {
  get,
  getDailyRateCents,
  updateDailyRateCents,
};

export default settings;
