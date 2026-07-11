exports.up = (pgm) => {
  pgm.createTable("stays", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    vehicle_id: {
      type: "uuid",
      notNull: true,
      references: "vehicles(id)",
      onDelete: "RESTRICT",
    },

    entry_time: {
      type: "timestamptz",
      default: pgm.func("timezone('utc', now())"),
      notNull: true,
    },

    exit_time: {
      type: "timestamptz",
    },

    created_at: {
      type: "timestamptz",
      default: pgm.func("timezone('utc', now())"),
      notNull: true,
    },

    updated_at: {
      type: "timestamptz",
      default: pgm.func("timezone('utc', now())"),
      notNull: true,
    },
  });

  pgm.createIndex("stays", "vehicle_id", {
    unique: true,
    where: "exit_time IS NULL",
    name: "stays_vehicle_id_open_unique",
  });
};

exports.down = false;
