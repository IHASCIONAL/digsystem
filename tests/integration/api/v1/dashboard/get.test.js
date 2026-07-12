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
    await orchestrator.createShiftAt(collaborator.id, {
      checkInTime: new Date().toISOString(),
    });

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

    expect(responseBody.revenue).toEqual({
      total_cents: 2500,
      today_cents: 2500,
    });

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
        revenue_cents: 2500,
      },
    ]);
  });

  test("Filters totals, trends and collaborator activity by date range", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const collaborator = await orchestrator.createCollaborator({});

    const oldVehicle = await orchestrator.createVehicle({
      createdBy: collaborator.id,
    });
    await orchestrator.backdateVehicleCreation(
      oldVehicle.id,
      "2020-01-15T12:00:00.000Z",
    );
    await orchestrator.createStayAt(oldVehicle.id, collaborator.id, {
      entryTime: "2020-01-15T12:00:00.000Z",
    });

    const recentVehicle = await orchestrator.createVehicle({
      createdBy: collaborator.id,
    });
    await orchestrator.createStayAt(recentVehicle.id, collaborator.id, {
      entryTime: new Date().toISOString(),
    });

    const filteredResponse = await fetch(
      "http://localhost:3000/api/v1/dashboard?start=2020-01-01&end=2020-01-31",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(filteredResponse.status).toBe(200);

    const filteredBody = await filteredResponse.json();
    expect(filteredBody.total_vehicles).toBe(1);

    // The 31-day range comes back fully zero-filled, day by day, not just
    // the days that actually had data.
    expect(filteredBody.daily_stays).toHaveLength(31);
    const filteredDayEntry = filteredBody.daily_stays.find(
      (entry) => entry.date === "2020-01-15",
    );
    expect(filteredDayEntry.count).toBe(1);
    const otherDaysTotal = filteredBody.daily_stays
      .filter((entry) => entry.date !== "2020-01-15")
      .reduce((sum, entry) => sum + entry.count, 0);
    expect(otherDaysTotal).toBe(0);

    expect(filteredBody.collaborator_activity).toEqual([
      {
        user_id: collaborator.id,
        username: collaborator.username,
        vehicles_registered: 1,
        check_ins: 1,
        check_outs: 0,
        revenue_cents: 0,
      },
    ]);

    const unfilteredResponse = await fetch(
      "http://localhost:3000/api/v1/dashboard",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );
    const unfilteredBody = await unfilteredResponse.json();
    expect(unfilteredBody.total_vehicles).toBeGreaterThanOrEqual(2);
    expect(unfilteredBody.daily_stays).toHaveLength(30);
  });

  test("Rejects a range with only one side filled", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard?start=2020-01-01",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Rejects a range where the start is after the end", async () => {
    const admin = await orchestrator.createAdmin({});
    const adminSession = await orchestrator.createSession(admin.id);

    const response = await fetch(
      "http://localhost:3000/api/v1/dashboard?start=2020-02-01&end=2020-01-01",
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );

    expect(response.status).toBe(400);

    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });
});
