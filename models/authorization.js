import { InternalServerError } from "infra/errors";

const availableFeatures = [
  //USER
  "create:user",
  "read:user",
  "read:user:self",
  "update:user",
  "update:user:others",

  // SESSION
  "create:session",
  "read:session",

  // ACTIVATION TOKEN
  "read:activation_token",

  // MIGRATION
  "create:migration",
  "read:migration",

  //STATUS
  "read:status",
  "read:status:all",

  // VEHICLE
  "create:vehicle",
  "read:vehicle",
  "update:vehicle",
  "delete:vehicle",
  "delete:vehicle:others",

  // STAY
  "create:stay",
  "read:stay",
  "read:stay:all",
  "update:stay",
  "update:stay:admin",

  // DASHBOARD
  "read:dashboard",

  // SHIFT
  "create:shift",
  "read:shift",
  "read:shift:all",
  "update:shift",
  "update:shift:admin",

  // SETTINGS
  "read:settings",
  "update:settings",
];

const vehicleAndStayFeatures = [
  "create:session",
  "read:session",
  "create:vehicle",
  "read:vehicle",
  "update:vehicle",
  "delete:vehicle",
  "create:stay",
  "read:stay",
  "update:stay",
];

// Shift check-in/check-out is a collaborator-only routine — admins don't
// clock in, so this bundle is deliberately not part of adminFeatures below.
const shiftFeatures = ["create:shift", "read:shift", "update:shift"];

const collaboratorFeatures = [...vehicleAndStayFeatures, ...shiftFeatures];

const adminFeatures = [
  ...vehicleAndStayFeatures,
  "delete:vehicle:others",
  "create:user",
  "read:user",
  "update:user",
  "update:user:others",
  "read:dashboard",
  "read:settings",
  "update:settings",
  "read:stay:all",
  "update:stay:admin",
  "read:shift:all",
  "update:shift:admin",
];

// A collaborator can only delete a vehicle they registered themselves, and
// only shortly after registering it — long enough to fix a typo'd plate,
// not to remove one with real activity behind it.
const VEHICLE_DELETION_WINDOW_IN_MS = 60 * 60 * 1000;

function can(user, feature, resource) {
  validateUser(user);
  validateFeature(feature);
  let authorized = false;

  if (user.features.includes(feature)) {
    authorized = true;
  }

  if (feature === "update:user" && resource) {
    authorized = false;

    if (user.id === resource.id || can(user, "update:user:others")) {
      authorized = true;
    }
  }

  if (feature === "delete:vehicle" && resource) {
    authorized = false;

    if (can(user, "delete:vehicle:others")) {
      authorized = true;
    } else if (user.id === resource.created_by) {
      const registeredAt = new Date(resource.created_at).getTime();
      if (Date.now() - registeredAt <= VEHICLE_DELETION_WINDOW_IN_MS) {
        authorized = true;
      }
    }
  }

  return authorized;
}

function filterOutput(user, feature, resource) {
  validateUser(user);
  validateFeature(feature);
  validateResource(resource);
  if (feature === "read:user") {
    const output = {
      id: resource.id,
      username: resource.username,
      features: resource.features,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
    };

    if (can(user, "update:user:others")) {
      output.full_name = resource.full_name;
      output.cpf = resource.cpf;
      output.phone = resource.phone;
    }

    return output;
  }
  if (feature === "read:user:self") {
    if (user.id === resource.id) {
      return {
        id: resource.id,
        username: resource.username,
        email: resource.email,
        features: resource.features,
        created_at: resource.created_at,
        updated_at: resource.updated_at,
      };
    }
  }

  if (feature === "read:session") {
    if (user.id === resource.user_id) {
      return {
        id: resource.id,
        token: resource.token,
        user_id: resource.user_id,
        created_at: resource.created_at,
        updated_at: resource.updated_at,
        expires_at: resource.expires_at,
      };
    }
  }

  if (feature === "read:activation_token") {
    return {
      id: resource.id,
      user_id: resource.user_id,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
      expires_at: resource.expires_at,
      used_at: resource.used_at,
    };
  }

  if (feature === "read:migration") {
    return resource.map((migration) => {
      return {
        path: migration.path,
        name: migration.name,
        timestamp: migration.timestamp,
      };
    });
  }

  if (feature === "read:status") {
    const output = {
      updated_at: resource.updated_at,
      dependencies: {
        database: {
          max_connections: resource.dependencies.database.max_connections,
          current_connections:
            resource.dependencies.database.current_connections,
        },
      },
    };
    if (can(user, "read:status:all")) {
      output.dependencies.database.version =
        resource.dependencies.database.version;
    }
    return output;
  }
}

function validateUser(user) {
  if (!user || !user.features) {
    throw new InternalServerError({
      cause: "É necessário fornecer `user` no model `authorization`.",
    });
  }
}

function validateFeature(feature) {
  if (!feature || !availableFeatures.includes(feature)) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer uma `feature` conhecida no model `authorization`.",
    });
  }
}

function validateResource(resource) {
  if (!resource) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer um `resource` em `authorization.filterOutput()`.",
    });
  }
}
const authorization = {
  can,
  filterOutput,
  collaboratorFeatures,
  adminFeatures,
};

export default authorization;
