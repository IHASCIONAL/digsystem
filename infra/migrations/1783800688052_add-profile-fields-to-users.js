exports.up = (pgm) => {
  pgm.alterColumn("users", "email", { notNull: false });

  pgm.addColumn("users", {
    full_name: {
      type: "varchar(120)",
    },

    cpf: {
      type: "varchar(14)",
    },

    phone: {
      type: "varchar(20)",
    },
  });
};

exports.down = false;
