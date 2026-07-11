import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/settings", () => {
  test("Anonymous user cannot update settings", async () => {
    const response = await fetch("http://localhost:3000/api/v1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_rate_cents: 3000 }),
    });

    expect(response.status).toBe(403);
  });

  test("Collaborator cannot update settings", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch("http://localhost:3000/api/v1/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({ daily_rate_cents: 3000 }),
    });

    expect(response.status).toBe(403);
  });

  test("Admin updates the daily rate", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch("http://localhost:3000/api/v1/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${adminSession.token}`,
      },
      body: JSON.stringify({ daily_rate_cents: 3500 }),
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.daily_rate_cents).toBe(3500);

    const getResponse = await fetch("http://localhost:3000/api/v1/settings", {
      headers: { Cookie: `session_id=${adminSession.token}` },
    });
    const getResponseBody = await getResponse.json();
    expect(getResponseBody.daily_rate_cents).toBe(3500);
  });

  test("Rejects a zero or negative daily rate", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch("http://localhost:3000/api/v1/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${adminSession.token}`,
      },
      body: JSON.stringify({ daily_rate_cents: 0 }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("A new check-in after the rate changes charges the new price", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    await fetch("http://localhost:3000/api/v1/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${adminSession.token}`,
      },
      body: JSON.stringify({ daily_rate_cents: 4000 }),
    });

    const vehicle = await orchestrator.createVehicle();

    const stayResponse = await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({ plate: vehicle.plate }),
    });

    const stayResponseBody = await stayResponse.json();
    expect(stayResponseBody.price_cents).toBe(4000);
  });
});
