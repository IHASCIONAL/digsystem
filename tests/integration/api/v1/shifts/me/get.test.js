import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/shifts/me", () => {
  test("Anonymous user cannot access it", async () => {
    const response = await fetch("http://localhost:3000/api/v1/shifts/me");

    expect(response.status).toBe(403);
  });

  test("With no shift ever registered", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch("http://localhost:3000/api/v1/shifts/me", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual({ shift: null });
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

    const response = await fetch("http://localhost:3000/api/v1/shifts/me", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.shift.user_id).toBe(collaborator.id);
    expect(responseBody.shift.check_out_time).toBeNull();
  });

  test("A shift older than 10h is auto-closed and no longer shows as open", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const elevenHoursAgo = new Date(
      Date.now() - 11 * 60 * 60 * 1000,
    ).toISOString();
    const staleShift = await orchestrator.createShiftAt(collaborator.id, {
      checkInTime: elevenHoursAgo,
    });

    const response = await fetch("http://localhost:3000/api/v1/shifts/me", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toEqual({ shift: null });

    const closedShiftInDatabase = await database.query({
      text: "SELECT * FROM shifts WHERE id = $1;",
      values: [staleShift.id],
    });
    const closedShift = closedShiftInDatabase.rows[0];

    expect(closedShift.auto_closed).toBe(true);
    expect(closedShift.check_out_time).not.toBeNull();

    const expectedCheckOut =
      new Date(staleShift.check_in_time).getTime() + 10 * 60 * 60 * 1000;
    expect(new Date(closedShift.check_out_time).getTime()).toBe(
      expectedCheckOut,
    );
  });
});
