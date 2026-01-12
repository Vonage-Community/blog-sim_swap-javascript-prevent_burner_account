# Prevent Burner Account Creation Using the SIM Swap Insight

## Overview

This project is a web application demonstrating how to prevent malicious burner accounts where the creator is using a potentially stolen phone number by utilizing the Vonage SIM Swap Insight to verify against phone numbers.

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
   http://localhost:8000/
   ```
