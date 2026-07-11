require("dotenv").config({ path: ".env.development" });
const { Client } = require("pg");
const bcryptjs = require("bcryptjs");

// Keep this in sync with `adminFeatures` in models/authorization.js — this
// script can't import that ESM file directly since it runs as plain Node,
// outside the Next.js build pipeline that resolves the `models/...` alias.
const ADMIN_FEATURES = [
  "create:session",
  "read:session",
  "create:vehicle",
  "read:vehicle",
  "update:vehicle",
  "create:stay",
  "read:stay",
  "update:stay",
  "create:user",
  "read:user",
];

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const plainPassword = process.env.ADMIN_PASSWORD;

  if (!username || !plainPassword) {
    console.error(
      "Defina ADMIN_USERNAME e ADMIN_PASSWORD antes de rodar este script.",
    );
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
  });

  await client.connect();

  try {
    const existing = await client.query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1);",
      [username],
    );

    if (existing.rowCount > 0) {
      console.log(`Usuário "${username}" já existe, nada a fazer.`);
      return;
    }

    const rounds = process.env.NODE_ENV === "production" ? 14 : 1;
    const hashedPassword = await bcryptjs.hash(plainPassword, rounds);

    await client.query(
      `INSERT INTO users (username, password, features)
       VALUES ($1, $2, $3);`,
      [username, hashedPassword, ADMIN_FEATURES],
    );

    console.log(`Admin "${username}" criado com sucesso.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
