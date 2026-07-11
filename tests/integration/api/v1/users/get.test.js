import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users", () => {
  test("Anonymous user cannot list users", async () => {
    const response = await fetch("http://localhost:3000/api/v1/users");

    expect(response.status).toBe(403);
  });

  test("Collaborator user cannot list users", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch("http://localhost:3000/api/v1/users", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(403);
  });

  test("Admin lists every user, including full profile fields", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const collaborator = await orchestrator.createCollaborator({
      full_name: "Colaborador Um",
      phone: "11988887777",
    });

    const response = await fetch("http://localhost:3000/api/v1/users", {
      headers: { Cookie: `session_id=${adminSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.length).toBeGreaterThanOrEqual(2);

    const collaboratorEntry = responseBody.find(
      (entry) => entry.id === collaborator.id,
    );
    expect(collaboratorEntry).toEqual({
      id: collaborator.id,
      username: collaborator.username,
      features: collaborator.features,
      full_name: "Colaborador Um",
      cpf: null,
      phone: "11988887777",
      created_at: collaboratorEntry.created_at,
      updated_at: collaboratorEntry.updated_at,
    });
  });
});
