require("dotenv").config();
const path = require("path");
const express = require("express");
const { NetworkClient } = require('@vonage/network-client');
const { AuthenticationType } = require('@vonage/server-client');

const app = express();
app.use(express.json());
app.use(express.static("public"));

const simSwapApiUrl = "https://api-eu.vonage.com/camara/sim-swap/v040/check";
const users = {};

const APPLICATION_ID = process.env.VONAGE_APPLICATION_ID;
const PRIVATE_KEY = process.env.VONAGE_PRIVATE_KEY;

class SimSwap extends NetworkClient {
  authType = AuthenticationType.CIBA;
  _purpose = "FraudPreventionAndDetection"
  _scope = "check-sim-swap"

  async checkSim(phoneNumber) {
    this._msisdn = phoneNumber
    const response = await this.sendPostRequest(
      simSwapApiUrl,
      {
        phoneNumber: phoneNumber,
        maxAge: process.env.MAX_AGE,
      }
    );

    return response.swapped;
  }
}

const simSwapClient = new SimSwap({
  applicationId: APPLICATION_ID,
  privateKey: PRIVATE_KEY,
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

app.get("/main", (req, res) => {
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

    const simSwapped = await simSwapClient.checkSim(user.phoneNumber);

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
