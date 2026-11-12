import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import mongoose from "mongoose";

const scrypt = promisify(scryptCallback);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returnedObject) {
        delete returnedObject.password;
        delete returnedObject.__v;
        return returnedObject;
      },
    },
  },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;

  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(this.password, salt, 64);
  this.password = `scrypt:${salt}:${Buffer.from(derivedKey).toString("hex")}`;
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (typeof candidate !== "string") return false;

  const [algorithm, salt, storedHash] = this.password.split(":");
  if (algorithm !== "scrypt" || !salt || !storedHash) return false;

  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(await scrypt(candidate, salt, expected.length));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const User = mongoose.models.User ?? mongoose.model("User", userSchema);

export default User;
