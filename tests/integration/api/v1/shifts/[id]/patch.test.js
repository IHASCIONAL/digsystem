import orchestrator from "tests/orchestrator.js";
import { randomUUID } from "node:crypto";

let collaborator;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  collaborator = await orchestrator.createCollaborator({});
});

describe("PATCH /api/v1/shifts/[id]", () => {
  test("Anonymous user cannot edit a shift", async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/shifts/${randomUUID()}`,
      { method: "PATCH" },
    );

    expect(response.status).toBe(403);
  });

  test("Collaborator cannot edit a shift", async () => {
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch(
      `http://localhost:3000/api/v1/shifts/${randomUUID()}`,
      {
        method: "PATCH",
        headers: { Cookie: `session_id=${collaboratorSession.token}` },
      },
    );

    expect(response.status).toBe(403);
  });

  test("Admin corrects the check-in and check-out of a shift", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const openShift = await orchestrator.createShiftAt(collaborator.id, {
      checkInTime: "2026-01-10T08:00:00.000Z",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/shifts/${openShift.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          check_in_time: "2026-01-10T08:00:00.000Z",
          check_out_time: "2026-01-10T16:00:00.000Z",
        }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.check_out_time).toBe("2026-01-10T16:00:00.000Z");
    expect(responseBody.auto_closed).toBe(false);
    expect(responseBody.edited_by).toBe(admin.id);
    expect(responseBody.edited_at).not.toBeNull();
  });

  test("Rejects a check-out before the check-in", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const openShift = await orchestrator.createShiftAt(collaborator.id, {
      checkInTime: "2026-01-11T08:00:00.000Z",
    });

    const response = await fetch(
      `http://localhost:3000/api/v1/shifts/${openShift.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          check_out_time: "2026-01-11T05:00:00.000Z",
        }),
      },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Returns 404 for a nonexistent shift", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/shifts/${randomUUID()}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({ check_in_time: "2026-01-10T08:00:00.000Z" }),
      },
    );

    expect(response.status).toBe(404);
  });
});
