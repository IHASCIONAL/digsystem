import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/shifts", () => {
  test("Anonymous user cannot check in", async () => {
    const response = await fetch("http://localhost:3000/api/v1/shifts", {
      method: "POST",
    });

    expect(response.status).toBe(403);
  });

  test("Admin cannot check in (shift tracking is collaborator-only)", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch("http://localhost:3000/api/v1/shifts", {
      method: "POST",
      headers: { Cookie: `session_id=${adminSession.token}` },
    });

    expect(response.status).toBe(403);
  });

  test("Collaborator checks in", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch("http://localhost:3000/api/v1/shifts", {
      method: "POST",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(201);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      id: responseBody.id,
      user_id: collaborator.id,
      check_in_time: responseBody.check_in_time,
      check_out_time: null,
      auto_closed: false,
      edited_by: null,
      edited_at: null,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });
  });

  test("Cannot check in twice without checking out", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response1 = await fetch("http://localhost:3000/api/v1/shifts", {
      method: "POST",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });
    expect(response1.status).toBe(201);

    const response2 = await fetch("http://localhost:3000/api/v1/shifts", {
      method: "POST",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response2.status).toBe(400);

    const response2Body = await response2.json();
    expect(response2Body).toEqual({
      name: "ValidationError",
      message: "Você já está com o expediente em aberto.",
      action: "Registre o check-out antes de um novo check-in.",
      status_code: 400,
    });
  });

  test("A stale open shift (>10h) from a previous day is auto-closed before a new check-in is allowed", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    // Well past both the 10h auto-close window and the calendar-day
    // boundary, so this check-in doesn't collide with the once-per-day
    // rule (that scenario is covered separately below).
    const thirtyHoursAgo = new Date(
      Date.now() - 30 * 60 * 60 * 1000,
    ).toISOString();
    await orchestrator.createShiftAt(collaborator.id, {
      checkInTime: thirtyHoursAgo,
    });

    const response = await fetch("http://localhost:3000/api/v1/shifts", {
      method: "POST",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(201);

    const responseBody = await response.json();
    expect(responseBody.check_out_time).toBeNull();
    expect(responseBody.auto_closed).toBe(false);
  });

  test("Cannot check in again the same day after already checking out", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    await fetch("http://localhost:3000/api/v1/shifts", {
      method: "POST",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });
    await fetch("http://localhost:3000/api/v1/shifts", {
      method: "PATCH",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    const response = await fetch("http://localhost:3000/api/v1/shifts", {
      method: "POST",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      name: "ValidationError",
      message: "Você já fez check-in hoje.",
      action: "Um novo check-in só pode ser feito amanhã.",
      status_code: 400,
    });
  });
});
