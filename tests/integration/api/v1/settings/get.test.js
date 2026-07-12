import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/settings", () => {
  test("Anonymous user cannot read settings", async () => {
    const response = await fetch("http://localhost:3000/api/v1/settings");

    expect(response.status).toBe(403);
  });

  test("Collaborator cannot read settings", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch("http://localhost:3000/api/v1/settings", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(403);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      name: "ForbiddenError",
      message: "Você não possui permissão para executar esta ação.",
      action: `Verifique se o seu usuário possui a feature "read:settings"`,
      status_code: 403,
    });
  });

  test("Admin reads the default rate", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch("http://localhost:3000/api/v1/settings", {
      headers: { Cookie: `session_id=${adminSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      id: 1,
      rate_per_12h_cents: 2500,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });
  });
});
