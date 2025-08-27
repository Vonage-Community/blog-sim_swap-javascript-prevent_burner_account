require("dotenv").config();
const path = require("path");
const express = require("express");
const { Auth } = require("@vonage/auth");
const { SIMSwap } = require("@vonage/network-sim-swap");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const users = {};

const APPLICATION_ID = process.env.VONAGE_APPLICATION_ID;
const PRIVATE_KEY = process.env.VONAGE_PRIVATE_KEY;

const credentials = new Auth({
  applicationId: APPLICATION_ID,
  privateKey: fs.readFileSync(PRIVATE_KEY),
});
const options = {};
const simSwapClient = new SIMSwap(credentials, options);

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

app.get("/main", (_req, res) => {
  res.sendFile(path.join(__dirname, "views/main.html"));
});

app.post("/register", (req, res) => {
  const { username, password, phoneNumber } = req.body;

  if (users[username]) {
    return res
      .status(400)
      .json({ message: "Sorry, this username already exists." });
  }

  const phoneExists = Object.values(users).some(
    (user) => user.phoneNumber === phoneNumber
  );

  if (phoneExists) {
    return res.status(400).json({
      message: "This phone number is associated with another account.",
    });
  }

  users[username] = { username, password, phoneNumber };
  res.json({ message: "Registration success!" });
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = users[username];
    console.log("Attempting SIM swap check on phone number:", user.phoneNumber);

    if (!user) {
      return res.status(404).json({ message: "Not Found" });
    }

    if (user.password !== password) {
      return res
        .status(401)
        .json({ message: "This is an invalid username or password" });
    }

    const maxAge = Number(process.env.MAX_AGE || 240);

    const simSwapped = await simSwapClient.checkSwapSim({
      phoneNumber: user.phoneNumber,
      maxAge,
    });

    if (simSwapped) {
      return res
        .status(401)
        .json({ message: "SIM Swap: true", simSwapped: true });
    }

    res.json({ message: "Success" });
  } catch (err) {
    console.error("Login error:", err);

    if (err.response && err.response.text) {
      const body = await err.response.text();
      console.error("Vonage SIM Swap API response:", body);
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
