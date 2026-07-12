import orchestrator from "tests/orchestrator.js";
import { randomUUID } from "node:crypto";

let collaborator;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  collaborator = await orchestrator.createCollaborator({});
});

describe("GET /api/v1/shifts/[id]", () => {
  test("Anonymous user cannot fetch a shift by id", async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/shifts/${randomUUID()}`,
    );

    expect(response.status).toBe(403);
  });

  test("Admin fetches an existing shift with the collaborator's username", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const openShift = await orchestrator.createShiftAt(collaborator.id, {
      checkInTime: new Date().toISOString(),
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/shifts/${openShift.id}`,
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.collaborator_username).toBe(collaborator.username);
  });

  test("Admin gets 404 for a nonexistent shift", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/shifts/${randomUUID()}`,
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(404);
  });
});
