import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/dashboard", () => {
  test("Anonymous user cannot access the dashboard", async () => {
    const response = await fetch("http://localhost:3000/api/v1/dashboard");

    expect(response.status).toBe(403);
  });

  test("Collaborator user cannot access the dashboard", async () => {
    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    const response = await fetch("http://localhost:3000/api/v1/dashboard", {
      headers: { Cookie: `session_id=${collaboratorSession.token}` },
    });

    expect(response.status).toBe(403);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      name: "ForbiddenError",
      message: "Você não possui permissão para executar esta ação.",
      action: `Verifique se o seu usuário possui a feature "read:dashboard"`,
      status_code: 403,
    });
  });

  test("Admin sees vehicle and stay activity reflected in the summary", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const collaborator = await orchestrator.createCollaborator({});
    const collaboratorSession = await orchestrator.createSession(
      collaborator.id,
    );

    await fetch("http://localhost:3000/api/v1/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({ plate: "DSH1234" }),
    });

    await fetch("http://localhost:3000/api/v1/stays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({ plate: "DSH1234" }),
    });

    await fetch("http://localhost:3000/api/v1/stays", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${collaboratorSession.token}`,
      },
      body: JSON.stringify({ plate: "DSH1234" }),
    });

    const response = await fetch("http://localhost:3000/api/v1/dashboard", {
      headers: { Cookie: `session_id=${adminSession.token}` },
    });

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody.total_vehicles).toBe(1);
    expect(responseBody.currently_parked).toBe(0);

    expect(responseBody.peak_hours).toHaveLength(24);
    const totalPeakHourCount = responseBody.peak_hours.reduce(
      (sum, entry) => sum + entry.count,
      0,
    );
    expect(totalPeakHourCount).toBe(1);

    expect(responseBody.busiest_weekdays).toHaveLength(7);
    const totalWeekdayCount = responseBody.busiest_weekdays.reduce(
      (sum, entry) => sum + entry.count,
      0,
    );
    expect(totalWeekdayCount).toBe(1);

    expect(responseBody.daily_stays).toHaveLength(30);
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayEntry = responseBody.daily_stays.find(
      (entry) => entry.date === todayKey,
    );
    expect(todayEntry.count).toBe(1);

    expect(responseBody.collaborator_activity).toEqual([
      {
        user_id: collaborator.id,
        username: collaborator.username,
        vehicles_registered: 1,
        check_ins: 1,
        check_outs: 1,
      },
    ]);
  });
});
