exports.up = (pgm) => {
  pgm.createTable("vehicles", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    plate: {
      type: "varchar(8)",
      notNull: true,
      unique: true,
    },

    model: {
      type: "varchar(60)",
    },

    brand: {
      type: "varchar(60)",
    },

    color: {
      type: "varchar(30)",
    },

    notes: {
      type: "text",
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
};

exports.down = false;
