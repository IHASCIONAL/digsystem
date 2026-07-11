exports.up = (pgm) => {
  pgm.addColumn("vehicles", {
    owner_name: {
      type: "varchar(120)",
    },
  });
};

exports.down = false;
