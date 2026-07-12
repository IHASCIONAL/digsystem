import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/dashboard/peak-hours", () => {
  test("Anonymous user cannot access it", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard/peak-hours?date=2026-01-01",
    );

    expect(response.status).toBe(403);
  });

  test("Collaborator user cannot access it", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard/peak-hours?date=2026-01-01",
      { headers: { Cookie: `session_id=${collaboratorSession.token}` } },
    );

    expect(response.status).toBe(403);
  });

  test("Admin without a date", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard/peak-hours",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(400);
  });

  test("Admin with an invalid date", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard/peak-hours?date=not-a-date",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Admin filtering a specific day only counts that day's check-ins", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const collaborator = await orchestrator.createCollaborator({});
    const targetVehicle = await orchestrator.createVehicle();
    const otherDayVehicle = await orchestrator.createVehicle();

    await orchestrator.createStayAt(targetVehicle.id, collaborator.id, {
      entryTime: "2026-03-10T14:00:00.000Z",
    });
    await orchestrator.createStayAt(otherDayVehicle.id, collaborator.id, {
      entryTime: "2026-03-11T09:00:00.000Z",
    });

    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard/peak-hours?date=2026-03-10",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.date).toBe("2026-03-10");
    expect(responseBody.peak_hours).toHaveLength(24);

    const totalCount = responseBody.peak_hours.reduce(
      (sum, entry) => sum + entry.count,
      0,
    );
    expect(totalCount).toBe(1);

    const hourFourteen = responseBody.peak_hours.find(
      (entry) => entry.hour === 14,
    );
    expect(hourFourteen.count).toBe(1);
  });
});
