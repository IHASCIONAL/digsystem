exports.up = (pgm) => {
  pgm.createTable("shifts", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },

    check_in_time: {
      type: "timestamptz",
      default: pgm.func("timezone('utc', now())"),
      notNull: true,
    },

    check_out_time: {
      type: "timestamptz",
    },

    auto_closed: {
      type: "boolean",
      notNull: true,
      default: false,
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

  pgm.createIndex("shifts", "user_id", {
    unique: true,
    where: "check_out_time IS NULL",
    name: "shifts_user_id_open_unique",
  });
};

exports.down = false;
