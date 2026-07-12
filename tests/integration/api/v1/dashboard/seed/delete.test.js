import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/dashboard/seed", () => {
  test("Anonymous user cannot reset seed data", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard/seed",
      { method: "DELETE" },
    );

    expect(response.status).toBe(403);
  });

  test("Collaborator user cannot reset seed data", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard/seed",
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${collaboratorSession.token}` },
      },
    );

    expect(response.status).toBe(403);
  });

  test("Admin removes exactly the fake vehicles, stays and collaborators seed created", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const realVehicle = await orchestrator.createVehicle();

    await fetch("http://localhost:3000/api/v1/dashboard/seed", {
      method: "POST",
      headers: { Cookie: `session_id=${adminSession.token}` },
    });

    const beforeResponse = await fetch(
      "http://localhost:3000/api/v1/dashboard",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );
    const beforeBody = await beforeResponse.json();
    expect(beforeBody.total_vehicles).toBe(21);

    const resetResponse = await fetch(
      "http://localhost:3000/api/v1/dashboard/seed",
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${adminSession.token}` },
      },
    );

    expect(resetResponse.status).toBe(200);

    const afterResponse = await fetch(
      "http://localhost:3000/api/v1/dashboard",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );
    const afterBody = await afterResponse.json();

    // Only the 20 fake ("DV"-prefixed) vehicles are removed — the
    // pre-existing real one stays untouched.
    expect(afterBody.total_vehicles).toBe(1);

    const usersResponse = await fetch("http://localhost:3000/api/v1/users", {
      headers: { Cookie: `session_id=${adminSession.token}` },
    });
    const usersBody = await usersResponse.json();
    const fakeCollaboratorsLeft = usersBody.filter((user) =>
      user.username.startsWith("dev_"),
    );
    expect(fakeCollaboratorsLeft).toHaveLength(0);

    const vehicleCheckResponse = await fetch(
      `http://localhost:3000/api/v1/vehicles/${realVehicle.plate}`,
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );
    expect(vehicleCheckResponse.status).toBe(200);
  });
});
