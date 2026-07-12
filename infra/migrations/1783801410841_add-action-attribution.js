exports.up = (pgm) => {
  pgm.addColumn("vehicles", {
    created_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "SET NULL",
    },
  });

  pgm.addColumn("stays", {
    checked_in_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "SET NULL",
    },

    checked_out_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "SET NULL",
    },
  });
};

exports.down = false;
