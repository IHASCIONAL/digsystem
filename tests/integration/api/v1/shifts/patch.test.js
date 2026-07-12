import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/shifts", () => {
  test("Anonymous user cannot check out", async () => {
    const response = await fetch("http://localhost:3000/api/v1/shifts", {
      method: "PATCH",
    });

    expect(response.status).toBe(403);
  });

  test("Without an open shift", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch("http://localhost:3000/api/v1/shifts", {
      method: "PATCH",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(404);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      name: "NotFoundError",
      message: "Você não possui um expediente em aberto.",
      action: "Faça o check-in antes de registrar o check-out.",
      status_code: 404,
    });
  });

  test("With an open shift", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    await fetch("http://localhost:3000/api/v1/shifts", {
      method: "POST",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    const response = await fetch("http://localhost:3000/api/v1/shifts", {
      method: "PATCH",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.user_id).toBe(collaborator.id);
    expect(responseBody.check_out_time).not.toBeNull();
    expect(responseBody.auto_closed).toBe(false);
  });

  test("A shift already auto-closed by staleness cannot be checked out again", async () => {
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
      method: "PATCH",
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(404);
  });
});
