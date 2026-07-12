import orchestrator from "tests/orchestrator.js";

let collaborator;
let collaboratorSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  collaborator = await orchestrator.createCollaborator({});
  collaboratorSession = await orchestrator.createSession(collaborator.id);
  await orchestrator.createShiftAt(collaborator.id, {
    checkInTime: new Date().toISOString(),
  });
});

describe("GET /api/v1/stays/history", () => {
  test("Anonymous user cannot access the full history", async () => {
    const response = await fetch("http://localhost:3000/api/v1/stays/history");

    expect(response.status).toBe(403);
  });

  test("Collaborator cannot access the full history", async () => {
    const response = await fetch("http://localhost:3000/api/v1/stays/history", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(403);

    const responseBody = await response.json();
    expect(responseBody).toEqual({
      name: "ForbiddenError",
      message: "Você não possui permissão para executar esta ação.",
      action: `Verifique se o seu usuário possui a feature "read:stay:all"`,
      status_code: 403,
    });
  });

  test("Admin sees stays with plate and collaborator usernames", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const vehicle = await orchestrator.createVehicle();

    await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({ plate: vehicle.plate }),
    });
    await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({ plate: vehicle.plate }),
    });

    const response = await fetch("http://localhost:3000/api/v1/stays/history", {
      headers: { Cookie: `session_id=${adminSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    const stayForVehicle = responseBody.find(
      (stay) => stay.plate === vehicle.plate,
    );

    expect(stayForVehicle.checked_in_by_username).toBe(collaborator.username);
    expect(stayForVehicle.checked_out_by_username).toBe(collaborator.username);
    expect(stayForVehicle.price_cents).toBe(2500);
  });

  test("Filters by entry date range", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const oldVehicle = await orchestrator.createVehicle();
    const recentVehicle = await orchestrator.createVehicle();

    await orchestrator.createStayAt(oldVehicle.id, collaborator.id, {
      entryTime: "2020-01-15T12:00:00.000Z",
    });
    await orchestrator.createStayAt(recentVehicle.id, collaborator.id, {
      entryTime: new Date().toISOString(),
    });

    const response = await fetch(
      "http://localhost:3000/api/v1/stays/history?start=2020-01-01&end=2020-01-31",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    const plates = responseBody.map((stay) => stay.plate);

    expect(plates).toContain(oldVehicle.plate);
    expect(plates).not.toContain(recentVehicle.plate);
  });

  test("Rejects an invalid date format", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch(
      "http://localhost:3000/api/v1/stays/history?start=not-a-date",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });
});
