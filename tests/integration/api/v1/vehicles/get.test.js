import orchestrator from "tests/orchestrator.js";

let collaboratorSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  const collaborator = await orchestrator.createCollaborator({});
  collaboratorSession = await orchestrator.createSession(collaborator.id);
});

describe("GET /api/v1/vehicles", () => {
  test("Anonymous user cannot list vehicles", async () => {
    const response = await fetch("http://localhost:3000/api/v1/vehicles");

    expect(response.status).toBe(403);
  });

  test("With no vehicles registered", async () => {
    const response = await fetch("http://localhost:3000/api/v1/vehicles", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual([]);
  });

  test("With vehicles registered", async () => {
    const vehicle1 = await orchestrator.createVehicle({ plate: "LST1111" });
    const vehicle2 = await orchestrator.createVehicle({ plate: "LST2222" });

    const response = await fetch("http://localhost:3000/api/v1/vehicles", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual([
      expect.objectContaining({ id: vehicle1.id, plate: "LST1111" }),
      expect.objectContaining({ id: vehicle2.id, plate: "LST2222" }),
    ]);
  });
});
