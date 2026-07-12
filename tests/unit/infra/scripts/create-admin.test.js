import authorization from "models/authorization.js";
const { ADMIN_FEATURES } = require("infra/scripts/create-admin.js");

describe("infra/scripts/create-admin.js", () => {
  test("ADMIN_FEATURES stays in sync with authorization.adminFeatures", () => {
    // This list is duplicated because the script runs as plain Node, outside
    // the Next.js build pipeline that resolves the `models/...` import alias
    // — see the comment in create-admin.js. This test is what actually
    // enforces the "keep in sync" comment instead of relying on someone
    // remembering to update both places (as happened once already).
    expect(new Set(ADMIN_FEATURES)).toEqual(
      new Set(authorization.adminFeatures),
    );
  });
});
