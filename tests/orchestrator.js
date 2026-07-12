import retry from "async-retry";
import { faker } from "@faker-js/faker";
import database from "infra/database.js";
import migrator from "models/migrator.js";
import user from "models/user.js";
import session from "models/session";
import activation from "models/activation.js";
import authorization from "models/authorization.js";
import vehicle from "models/vehicle.js";

const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

async function waitForAllServices() {
  await waitForWebServer();
  await waitForEmailServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 5000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");
      if (response.status !== 200) {
        throw Error();
      }
    }
  }
  async function waitForEmailServer() {
    return retry(fetchEmailPage, {
      retries: 100,
      maxTimeout: 5000,
    });

    async function fetchEmailPage() {
      const response = await fetch(emailHttpUrl);
      if (response.status !== 200) {
        throw Error();
      }
    }
  }
}

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function createUser(userObject = {}) {
  return await user.create({
    username:
      userObject.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject.email || faker.internet.email(),
    password: userObject.password || "validpassword",
    features: userObject.features,
    full_name: userObject.full_name,
    cpf: userObject.cpf,
    phone: userObject.phone,
  });
}

async function createAdmin(userObject = {}) {
  return await createUser({
    ...userObject,
    features: authorization.adminFeatures,
  });
}

async function createCollaborator(userObject = {}) {
  return await createUser({
    ...userObject,
    features: authorization.collaboratorFeatures,
  });
}

async function activateUser(inactiveUser) {
  return await activation.activateUserByUserId(inactiveUser.id);
}

async function createSession(userId) {
  return await session.create(userId);
}

async function createVehicle(vehicleObject = {}) {
  return await vehicle.create(
    {
      plate: vehicleObject.plate || generateRandomPlate(),
      owner_name: vehicleObject.owner_name,
      model: vehicleObject.model,
      brand: vehicleObject.brand,
      color: vehicleObject.color,
      notes: vehicleObject.notes,
    },
    vehicleObject.createdBy,
  );

  function generateRandomPlate() {
    return `${faker.string.alpha({ length: 3, casing: "upper" })}${faker.string.numeric(4)}`;
  }
}

async function backdateVehicleCreation(vehicleId, createdAt) {
  await database.query({
    text: `UPDATE vehicles SET created_at = $2 WHERE id = $1;`,
    values: [vehicleId, createdAt],
  });
}

async function createStayAt(vehicleId, checkedInBy, { entryTime }) {
  const results = await database.query({
    text: `
      INSERT INTO stays (vehicle_id, entry_time, checked_in_by)
      VALUES ($1, $2, $3)
      RETURNING *
      ;
    `,
    values: [vehicleId, entryTime, checkedInBy],
  });
  return results.rows[0];
}

async function createShiftAt(userId, { checkInTime }) {
  const results = await database.query({
    text: `
      INSERT INTO shifts (user_id, check_in_time)
      VALUES ($1, $2)
      RETURNING *
      ;
    `,
    values: [userId, checkInTime],
  });
  return results.rows[0];
}

async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: "DELETE",
  });
}

async function getLastEmail() {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);
  const emailListBody = await emailListResponse.json();
  const lastEmailItem = emailListBody.pop();

  if (!lastEmailItem) {
    return null;
  }

  const emailTextResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmailItem.id}.plain`,
  );
  const emailTextBody = await emailTextResponse.text();

  lastEmailItem.text = emailTextBody;

  return lastEmailItem;
}

function extractUUID(text) {
  const match = text.match(/[0-9a-fA-F-]{36}/);
  return match ? match[0] : null;
}

async function addFeaturesToUser(userObject, features) {
  const updatedUser = await user.addFeatures(userObject.id, features);

  return updatedUser;
}
const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createAdmin,
  createCollaborator,
  createSession,
  createVehicle,
  backdateVehicleCreation,
  createStayAt,
  createShiftAt,
  deleteAllEmails,
  getLastEmail,
  extractUUID,
  activateUser,
  addFeaturesToUser,
};
export default orchestrator;
