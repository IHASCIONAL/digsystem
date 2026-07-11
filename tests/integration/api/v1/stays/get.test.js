import orchestrator from "tests/orchestrator.js";

let collaboratorSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  const collaborator = await orchestrator.createCollaborator({});
  collaboratorSession = await orchestrator.createSession(collaborator.id);
});

async function checkIn(plate) {
  await fetch("http://localhost:3000/api/v1/stays", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${collaboratorSession.token}`,
    },
    body: JSON.stringify({ plate }),
  });
}

async function checkOut(plate) {
  await fetch("http://localhost:3000/api/v1/stays", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${collaboratorSession.token}`,
    },
    body: JSON.stringify({ plate }),
  });
}

describe("GET /api/v1/stays", () => {
  test("Anonymous user cannot list parked vehicles", async () => {
    const response = await fetch("http://localhost:3000/api/v1/stays");

    expect(response.status).toBe(403);
  });

  test("With no vehicles parked", async () => {
    const response = await fetch("http://localhost:3000/api/v1/stays", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual([]);
  });

  test("With vehicles parked", async () => {
    const vehicle1 = await orchestrator.createVehicle({ model: "Onix" });
    const vehicle2 = await orchestrator.createVehicle({ model: "Gol" });

    await checkIn(vehicle1.plate);
    await checkIn(vehicle2.plate);

    const response = await fetch("http://localhost:3000/api/v1/stays", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual([
      {
        id: responseBody[0].id,
        vehicle_id: vehicle1.id,
        plate: vehicle1.plate,
        model: "Onix",
        entry_time: responseBody[0].entry_time,
        elapsed_in_seconds: responseBody[0].elapsed_in_seconds,
      },
      {
        id: responseBody[1].id,
        vehicle_id: vehicle2.id,
        plate: vehicle2.plate,
        model: "Gol",
        entry_time: responseBody[1].entry_time,
        elapsed_in_seconds: responseBody[1].elapsed_in_seconds,
      },
    ]);

    expect(responseBody[0].elapsed_in_seconds).toBeGreaterThanOrEqual(0);
  });

  test("Does not include vehicles that already left", async () => {
    const vehicle = await orchestrator.createVehicle();

    await checkIn(vehicle.plate);
    await checkOut(vehicle.plate);

    const response = await fetch("http://localhost:3000/api/v1/stays", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });
    const responseBody = await response.json();

    const plates = responseBody.map((parkedStay) => parkedStay.plate);
    expect(plates).not.toContain(vehicle.plate);
  });
});
