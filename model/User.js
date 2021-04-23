//const { ObjectId } = require("bson");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  _id: { type: String }, //JHED ID
  name: { type: String },
  email: { type: String },
  affiliation: { type: String }, //STUDENT, FACULTY or STAFF
  school: { type: String },
  grade: { type: String },
  plan_ids: [{ type: Schema.Types.ObjectId, ref: "Plan" }],
});

const User = mongoose.model("User", userSchema);

module.exports = User;
