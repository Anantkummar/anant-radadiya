Run `node server.cjs` and open http://localhost:8002. Phones on the same network can use the computer's LAN IP with port 8002.

The shared counter starts at zero and increments once per page load using `POST /api/visits`. Open pages refresh the total every 15 seconds without incrementing it. The total is saved in `.visit-data/visits.json` and survives server restarts. Keep that directory on persistent storage and run one server process.

Static hosting alone cannot run this counter. A public deployment must run this Node server with persistent storage, or route `/api/visits` to a shared database-backed service. Do not upload the counter data as public assets.

Check counter behavior with `node --test server.test.cjs visits.test.cjs`.

Each page load sends a new visit ID. Failed requests retry after five seconds using the same ID, so a lost response does not count a visit twice. The server persists the most recent 10,000 IDs alongside the total. Refreshing the page creates a new visit; background updates only read the total. Offline pages keep the last known total and show a neutral status indicator until they reconnect.
