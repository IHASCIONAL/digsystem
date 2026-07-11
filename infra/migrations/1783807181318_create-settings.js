exports.up = (pgm) => {
  pgm.createTable("settings", {
    id: {
      type: "smallint",
      primaryKey: true,
    },

    daily_rate_cents: {
      type: "integer",
      notNull: true,
      default: 2500,
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

  pgm.addConstraint("settings", "settings_single_row", {
    check: "id = 1",
  });

  pgm.sql("INSERT INTO settings (id) VALUES (1);");
};

exports.down = false;
