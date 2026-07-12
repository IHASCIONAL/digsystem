exports.up = (pgm) => {
  const auditColumns = {
    edited_by: {
      type: "uuid",
      references: "users(id)",
      onDelete: "SET NULL",
    },
    edited_at: {
      type: "timestamptz",
    },
  };

  pgm.addColumn("stays", auditColumns);
  pgm.addColumn("shifts", auditColumns);
};

exports.down = false;
