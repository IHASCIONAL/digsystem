exports.up = (pgm) => {
  pgm.addColumn("stays", {
    price_cents: {
      type: "integer",
      notNull: true,
      default: 2500,
    },
  });
};

exports.down = false;
