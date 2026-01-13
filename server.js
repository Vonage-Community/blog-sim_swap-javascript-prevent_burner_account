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

let credentials = null;
if (APPLICATION_ID && PRIVATE_KEY) {
  try {
    const keyContent = fs.readFileSync(PRIVATE_KEY);
    credentials = new Auth({
      applicationId: APPLICATION_ID,
      privateKey: keyContent,
    });
  } catch (e) {
    console.warn("Failed to read VONAGE_PRIVATE_KEY file:", e && e.message);
    credentials = null;
  }
} else {
  console.warn("VONAGE_APPLICATION_ID or VONAGE_PRIVATE_KEY not set; JWT auth disabled.");
}

const apiKey = process.env.VONAGE_API_KEY;
const apiSecret = process.env.VONAGE_API_SECRET;

let identityClient;
try {
  let IdentityInsights;
  try {
    IdentityInsights = require("@vonage/identity-insights").IdentityInsights;
  } catch (err) {
    IdentityInsights = null;
    console.warn("@vonage/identity-insights not found or missing build artifacts; falling back to HTTP checks");
  }

  if (IdentityInsights) {
    if (apiKey && apiSecret) {
      identityClient = new IdentityInsights({ apiKey, apiSecret });
    } else {
      // fall back to JWT-authenticated client when API key/secret are not provided
      identityClient = new IdentityInsights({ auth: credentials });
    }
  } else {
    identityClient = null;
  }
} catch (e) {
  console.warn("Failed to initialize Identity Insights client:", e && e.message);
  identityClient = null;
}

async function checkSimSwapWithIdentityInsights(phoneNumber, period) {
  if (Number(period) < 500) {
    console.log("Forcing SIM swap true due to period <", period);
    return true;
  }

  if (!identityClient) {
    return false;
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

  // Fallback: call the Insights Sim Swap HTTP endpoint directly using API key/secret if available
  if (apiKey && apiSecret) {
    try {
      const url = "https://api.vonage.com/v1/insights/sim-swap";
      const body = { msisdn: phoneNumber, period: period };
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64"),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        return false;
      }
      const data = await res.json();
      if (!data) {
        return false;
      }
      if (data.sim_swap === true || data.simSwap === true) {
        return true;
      }
      if (data.result && data.result.sim_swap) {
        return true;
      }
    } catch (e) {
      console.error("Fallback HTTP sim-swap check failed:", e && e.message);
    }
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

