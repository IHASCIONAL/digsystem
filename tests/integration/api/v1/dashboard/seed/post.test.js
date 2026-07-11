import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/dashboard/seed", () => {
  test("Anonymous user cannot seed data", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard/seed",
      { method: "POST" },
    );

    expect(response.status).toBe(403);
  });

  test("Collaborator user cannot seed data", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard/seed",
      {
        method: "POST",
        headers: { Cookie: `session_id=${collaboratorSession.token}` },
      },
    );

    expect(response.status).toBe(403);
  });

  test("Admin seeds fake vehicles and stays (dev server always runs as development)", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const beforeResponse = await fetch(
      "http://localhost:3000/api/v1/dashboard",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );
    const beforeBody = await beforeResponse.json();

    const seedResponse = await fetch(
      "http://localhost:3000/api/v1/dashboard/seed",
      {
        method: "POST",
        headers: { Cookie: `session_id=${adminSession.token}` },
      },
    );

    expect(seedResponse.status).toBe(201);

    const afterResponse = await fetch(
      "http://localhost:3000/api/v1/dashboard",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );
    const afterBody = await afterResponse.json();

    expect(afterBody.total_vehicles).toBe(beforeBody.total_vehicles + 20);

    const adminActivity = afterBody.collaborator_activity.find(
      (activity) => activity.user_id === admin.id,
    );
    expect(adminActivity.vehicles_registered).toBe(20);
  });
});
