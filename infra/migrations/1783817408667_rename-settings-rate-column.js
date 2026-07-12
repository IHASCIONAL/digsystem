exports.up = (pgm) => {
  pgm.renameColumn("settings", "daily_rate_cents", "rate_per_12h_cents");
};

exports.down = false;
