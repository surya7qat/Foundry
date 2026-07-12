# Multi-Tenant Architecture & Database Flow Guide

This document explains the "Option A" routing strategy implemented in the Foundry system. It covers how the Master Database interacts with individual Client databases and routes frontend API requests dynamically.

## 1. The Master Database (`castings`)
The Master Database acts strictly as the **Central Authentication & Routing Directory**. It does not hold internal factory data (like molds or inventory variables). It holds two critical models:

*   **`Client` Model:** Stores the configuration for a single isolated company (e.g., Client name: "Tata Motors"). 
    *   This model stores **where** their specific raw database lives (`db_host`, `db_name`) 
    *   It also tracks **where** the React Frontend should route its requests when interacting with them (`api_endpoint`, ex: `https://api.tata.foundry.com`).
*   **`CustomUser` Model:** Stores all employee login credentials. Every user contains a `ForeignKey` directly linking them to the `Client` they belong to.

## 2. Auto-Creating a Client Database (Auto-Provisioning)
Whenever a new Client is added to the system, Django automatically builds their digital infrastructure without requiring any manual SQL scripts:
1. You log into the central Django Admin panel and create a new `Client` record (e.g., "Ashok Leyland") using your external MySQL Server IP.
2. The moment you hit **Save**, a custom `post_save` Python interceptor named `provision_database()` triggers automatically in the background.
3. Django securely logs into that remote MySQL server using the credentials you provided, runs a raw `CREATE DATABASE client_ashok_leyland` SQL query, and immediately executes `manage.py migrate` to construct all of the necessary, blank Django data tables inside their isolated database.

## 3. The Login Flow (How React discovers the Client DB)
Here is the step-by-step security payload when an employee begins their shift:
1. **React Login:** The employee enters their email (`john@tata.com`) on your global login page interface.
2. **Master Verification:** React POSTs these credentials to your central Master Django server's JWT endpoint (`/api/token/`).
3. **Serializer Interception:** The custom JWT Serializer checks the Master DB. It verifies the encrypted password, reads that John belongs to the "Tata Motors" client, and fetches the `api_endpoint` you mapped to Tata Motors.
4. **The Payload:** Django replies back to the React app with the standard Access/Refresh Tokens, **AND** the custom `api_endpoint` URL string attached securely to the JSON response.

## 4. Daily Usage (Routing Front-End Traffic)
*   **Storage:** React receives the login response and saves the `api_endpoint` into the browser's persistent `sessionStorage` object.
*   **Data Fetching:** Now, whenever John interacts with the React Dashboard (e.g., clicking on "View Castings"), React looks inside its `sessionStorage`. 
*   **Isolation:** Instead of requesting data from the Master database, React attaches the JWT Authorization Header and fires the Axios request directly at `https://api.tata.foundry.com/castings` instead. 

**Conclusion:** Your Master DB securely handles central routing and isolated environment provisioning, while your React application effortlessly handles dynamic API routing based on the user's specific client identity!
