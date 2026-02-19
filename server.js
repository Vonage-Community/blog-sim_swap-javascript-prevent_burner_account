require("dotenv").config();
const path = require("path");
const express = require("express");
const { IdentityInsights } = require("@vonage/identity-insights");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const users = {};

const APPLICATION_ID = process.env.VONAGE_APPLICATION_ID;
const PRIVATE_KEY = process.env.VONAGE_PRIVATE_KEY;
const PERIOD = process.env.PERIOD;

// Bootstrap Step
if (!APPLICATION_ID || !PRIVATE_KEY) {
  console.error('VONAGE_APPLICATION_ID or VONAGE_PRIVATE_KEY not set');
  process.exit(1);
}

const keyContent = fs.existsSync(PRIVATE_KEY)
  ? fs.readFileSync(PRIVATE_KEY, 'utf8')
  : PRIVATE_KEY;

if (!keyContent) {
  console.error('INVALID private key. Check if the file exists or the environment variable is correctly set');
  process.exit(1);
}

const identityClient = new IdentityInsights({
  applicationId: APPLICATION_ID,
  privateKey: keyContent,
});

async function checkSimSwapWithIdentityInsights(phoneNumber, period) {
  try {
    const resp = await identityClient.getIdentityInsights({
      phoneNumber: phoneNumber,
      purpose: 'FraudPreventionAndDetection',
      insights: {
        format: {},
        originalCarrier: {},
        currentCarrier: {},
        simSwap: {
          period: parseInt(period)
        }
      }
    });

    return resp.insights?.simSwap?.isSwapped === true;
  } catch (error) {
    console.warn('Identity Insights SDK call failed:', error && error.message);
  }
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

    const simSwapped = await checkSimSwapWithIdentityInsights(user.phoneNumber, PERIOD);

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

