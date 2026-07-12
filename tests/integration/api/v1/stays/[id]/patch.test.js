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

describe("PATCH /api/v1/stays/[id]", () => {
  test("Anonymous user cannot edit a stay", async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/stays/${randomUUID()}`,
      { method: "PATCH" },
    );

    expect(response.status).toBe(403);
  });

  test("Collaborator cannot edit a stay", async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/stays/${randomUUID()}`,
      {
        method: "PATCH",
        headers: { Cookie: `session_id=${collaboratorSession.token}` },
      },
    );

    expect(response.status).toBe(403);
  });

  test("Admin corrects the entry time, exit time and price of a closed stay", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const vehicle = await orchestrator.createVehicle();
    const openStay = await orchestrator.createStayAt(
      vehicle.id,
      collaborator.id,
      { entryTime: "2026-01-10T10:00:00.000Z" },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/stays/${openStay.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          entry_time: "2026-01-10T09:00:00.000Z",
          exit_time: "2026-01-10T15:00:00.000Z",
          price_cents: 3000,
        }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.entry_time).toBe("2026-01-10T09:00:00.000Z");
    expect(responseBody.exit_time).toBe("2026-01-10T15:00:00.000Z");
    expect(responseBody.price_cents).toBe(3000);
    expect(responseBody.edited_by).toBe(admin.id);
    expect(responseBody.edited_at).not.toBeNull();
    expect(responseBody.duration_in_seconds).toBe(6 * 60 * 60);
  });

  test("Admin manually closes an open stay", async () => {
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
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          exit_time: new Date().toISOString(),
          price_cents: 2500,
        }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.exit_time).not.toBeNull();
    expect(responseBody.price_cents).toBe(2500);
  });

  test("Rejects an exit time before the entry time", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const vehicle = await orchestrator.createVehicle();
    const openStay = await orchestrator.createStayAt(
      vehicle.id,
      collaborator.id,
      { entryTime: "2026-01-10T10:00:00.000Z" },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/stays/${openStay.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          exit_time: "2026-01-10T05:00:00.000Z",
          price_cents: 2500,
        }),
      },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Rejects a missing price when setting an exit time", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const vehicle = await orchestrator.createVehicle();
    const openStay = await orchestrator.createStayAt(
      vehicle.id,
      collaborator.id,
      { entryTime: "2026-01-10T10:00:00.000Z" },
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/stays/${openStay.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          exit_time: "2026-01-10T15:00:00.000Z",
        }),
      },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Returns 404 for a nonexistent stay", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/stays/${randomUUID()}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({ entry_time: "2026-01-10T10:00:00.000Z" }),
      },
    );

    expect(response.status).toBe(404);
  });
});
