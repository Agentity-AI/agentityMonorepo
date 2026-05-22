const crypto = require("crypto");

function generateFingerprint(publicKey) {
  return crypto
    .createHash("sha256")
    .update(publicKey)
    .digest("hex");
}

module.exports = { generateFingerprint };
