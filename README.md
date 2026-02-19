# Prevent Account Takeover Fraud with the Vonage SIM Swap Insight

## Overview

We all have business and personal accounts registered on several online websites and applications. Account takeover occurs when attackers hijack accounts using stolen credentials, SIM swaps, or phishing. In this blog post. I will demonstrate how to use Vonage SIM Swap Insight to verify phone numbers during login. Even if the hijacker has the correct user and password credentials, we’ll add an additional SIM Swap check.

## Prerequisites

- A [Vonage Developer Account](https://developer.vonage.com).
- Node.js and npm installed.

## Getting Started

1. Clone the repository and change directories.

2. Install the required packages:
   ```bash
   npm install
   ```

3. Move the `.env.example` file to `.env` file in the project root and include the following environment variables:
   ```bash
   mv .env.example .env
   ```

   ```bash
    JWT=your_jwt_token

    PERIOD=72
   ```

4. Run the application:
   ```bash
   nodemon server.js
   ```

5. Launch your web browser and enter the URL:
   ```bash
   http://localhost:3000/
   ```
