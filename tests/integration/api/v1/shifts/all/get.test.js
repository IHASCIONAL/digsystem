import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/shifts/all", () => {
  test("Anonymous user cannot list all shifts", async () => {
    const response = await fetch("http://localhost:3000/api/v1/shifts/all");

    expect(response.status).toBe(403);
  });

  test("Collaborator cannot list all shifts", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch("http://localhost:3000/api/v1/shifts/all", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(403);
  });

  test("Admin lists all shifts with the collaborator's username", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const collaborator = await orchestrator.createCollaborator({});
    await orchestrator.createShiftAt(collaborator.id, {
      checkInTime: new Date().toISOString(),
    });

    const response = await fetch("http://localhost:3000/api/v1/shifts/all", {
      headers: { Cookie: `session_id=${adminSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    const shiftForCollaborator = responseBody.find(
      (shift) => shift.user_id === collaborator.id,
    );
    expect(shiftForCollaborator.collaborator_username).toBe(
      collaborator.username,
    );
    expect(shiftForCollaborator.edited_by_username).toBeNull();
  });
});
