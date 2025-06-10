require("dotenv").config();
const path = require("path");
const express = require("express");
const { SIMSwap } = require('@vonage/network-sim-swap');

const app = express();
app.use(express.json());
app.use(express.static("public"));

const users = {};

const APPLICATION_ID = process.env.VONAGE_APPLICATION_ID;
const PRIVATE_KEY = process.env.VONAGE_PRIVATE_KEY;


const simSwapClient = new SIMSwap({
  applicationId: APPLICATION_ID,
  privateKey: PRIVATE_KEY,
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

app.get("/main", (_req, res) => {
  res.sendFile(path.join(__dirname, "views/main.html"));
});

app.post("/register", (req, res) => {
  const { username, password, phoneNumber } = req.body;

  if (users[username]) {
    return res.status(400).json({ message: "Sorry, this username already exists." });
  }

  const phoneExists = Object.values(users).some(
    (user) => user.phoneNumber === phoneNumber
  );

  if (phoneExists) {
    return res.status(400).json({ message: "This phone number is associated with another account." });
  }

  users[username] = { username, password, phoneNumber };
  res.json({ message: "Registration success!" });
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = users[username];

    if (!user) {
      return res.status(404).json({ message: "Not Found" });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "This is an invalid username or password" });
    }

    const simSwapped = await simSwapClient.checkSwapSim({phoneNumber: user.phoneNumber});

    if (simSwapped) {
      return res.status(401).json({ message: "SIM Swap: true" });
    }

    res.json({ message: "Success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
