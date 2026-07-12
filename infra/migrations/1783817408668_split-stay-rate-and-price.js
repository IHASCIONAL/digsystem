exports.up = (pgm) => {
  // price_cents used to be a flat fee snapshotted at check-in. It's now the
  // per-12h rate snapshotted at check-in (renamed to rate_cents), while the
  // final charged amount — which depends on the actual duration, known only
  // at check-out — becomes a separate, initially-null price_cents column.
  pgm.renameColumn("stays", "price_cents", "rate_cents");

  pgm.addColumn("stays", {
    price_cents: {
      type: "integer",
    },
  });
};

exports.down = false;
