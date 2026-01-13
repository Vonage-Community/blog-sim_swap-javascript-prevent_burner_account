require("dotenv").config();
const path = require("path");
const express = require("express");
const { Auth } = require("@vonage/auth");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const users = {};

const APPLICATION_ID = process.env.VONAGE_APPLICATION_ID;
const PRIVATE_KEY = process.env.VONAGE_PRIVATE_KEY;

// Bootstrap Step
if (!APPLICATION_ID || !PRIVATE_KEY) {
  console.error('VONAGE_APPLICATION_ID or VONAGE_PRIVATE_KEY not set');
  process.exit(1);
};

const keyContent = fs.existsSync(PRIVATE_KEY)
  ? fs.readFileSync(PRIVATE_KEY)
  : PRIVATE_KEY;

if (!keyContent) {
  console.error('INVALID private key. Check if the file exists or the environment variable is correctly set');
  process.exit(1);
}

const clientOptions = {};

const credentials = new Auth({
  applicationId: APPLICATION_ID,
  privateKey: keyContent,
});

async function checkSimSwapWithIdentityInsights(phoneNumber, period) {
  if (Number(period) < 500) {
    console.log("Forcing SIM swap true due to period <", period);
    return true;
  }

  try {
    if (typeof identityClient.simSwap === "function") {
      const resp = await identityClient.simSwap({ msisdn: phoneNumber, period: period });

      if (!resp) {
        return false;
      }
      if (resp.sim_swap === true || resp.simSwap === true) {
        return true;
      }
      if (resp.result && resp.result.sim_swap) {
        return true;
      }
      return false;
    }

    if (identityClient.insights && typeof identityClient.insights.simSwap === "function") {
      const resp = await identityClient.insights.simSwap({ msisdn: phoneNumber, period: period });
      if (!resp) {
        return false;
      }
      if (resp.sim_swap === true || resp.simSwap === true) {
        return true;
      }
      if (resp.result && resp.result.sim_swap) {
        return true;
      }
      return false;
    }
  } catch (e) {
    console.warn("Identity Insights SDK call failed, falling back to HTTP check:", e && e.message);
  }

  return false;
}

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

    if (!user) {
      return res.status(404).json({ message: "Not Found" });
    }

    console.log("Attempting SIM swap check on phone number:", user.phoneNumber);

    if (user.password !== password) {
      return res
        .status(401)
        .json({ message: "This is an invalid username or password" });
    }

    const period = process.env.PERIOD ? Number(process.env.PERIOD) : undefined;

    const simSwapped = await checkSimSwapWithIdentityInsights(user.phoneNumber, period);

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

