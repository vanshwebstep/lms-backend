const crypto = require("crypto");

const makeId = (prefix) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;

module.exports = { makeId };
