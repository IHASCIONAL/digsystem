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

  test("A stale open shift (>10h) is auto-closed before a new check-in is allowed", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const elevenHoursAgo = new Date(
      Date.now() - 11 * 60 * 60 * 1000,
    ).toISOString();
    await orchestrator.createShiftAt(collaborator.id, {
      checkInTime: elevenHoursAgo,
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
});
