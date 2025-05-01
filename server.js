require("dotenv").config();
const path = require("path");
const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());
app.use(express.static("public"));

const users = {};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

app.get("/main", (req, res) => {
  res.sendFile(path.join(__dirname, "views/main.html"));
});

const scope = "openid dpv:FraudPreventionAndDetection#check-sim-swap";
const authReqUrl = "https://api-eu.vonage.com/oauth2/bc-authorize";
const tokenUrl = "https://api-eu.vonage.com/oauth2/token";
const simSwapApiUrl = "https://api-eu.vonage.com/camara/sim-swap/v040/check";

async function authenticate(phone, scope) {
  const authReqResponse = await axios.post(
    authReqUrl,
    {
      login_hint: phone,
      scope: scope,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.JWT}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  
  const tokenResponse = await axios.post(
    tokenUrl,
    {
      auth_req_id: authReqResponse.data.auth_req_id,
      grant_type: "urn:openid:params:grant-type:ciba",
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.JWT}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return tokenResponse.data.access_token;
}

async function checkSim(phoneNumber) {
  const accessToken = await authenticate(phoneNumber, scope);
  try {
    const response = await axios.post(
      simSwapApiUrl,
      {
        phoneNumber: phoneNumber,
        maxAge: process.env.MAX_AGE,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.swapped;
  } catch (error) {
    console.error("SIM swap check error:", error.response?.data || error.message);
    throw error;
  }
}

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
    if (user && user.password === password) {
      const simSwapped = await checkSim(user.phoneNumber);
      if (simSwapped) {
        return res.status(401).json({ message: "SIM Swap: true" });
      } else {
        res.json({ message: "Success" });
      }
    } else {
      res.status(401).json({ message: "This is an invalid username or password" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error message." });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
