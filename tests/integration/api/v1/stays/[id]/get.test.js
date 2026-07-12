import orchestrator from "tests/orchestrator.js";
import { randomUUID } from "node:crypto";

let collaborator;
let collaboratorSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  collaborator = await orchestrator.createCollaborator({});
  collaboratorSession = await orchestrator.createSession(collaborator.id);
});

describe("GET /api/v1/stays/[id]", () => {
  test("Anonymous user cannot fetch a stay by id", async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/stays/${randomUUID()}`,
    );

    expect(response.status).toBe(403);
  });

  test("Collaborator cannot fetch a stay by id", async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/stays/${randomUUID()}`,
      { headers: { Cookie: `session_id=${collaboratorSession.token}` } },
    );

    expect(response.status).toBe(403);
  });

  test("Admin fetches an existing stay with joined data", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const vehicle = await orchestrator.createVehicle();
    const openStay = await orchestrator.createStayAt(
      vehicle.id,
      collaborator.id,
      { entryTime: new Date().toISOString() },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/stays/${openStay.id}`,
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.plate).toBe(vehicle.plate);
    expect(responseBody.checked_in_by_username).toBe(collaborator.username);
    expect(responseBody.edited_by_username).toBeNull();
  });

  test("Admin gets 404 for a nonexistent stay", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/stays/${randomUUID()}`,
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(404);
  });
});
