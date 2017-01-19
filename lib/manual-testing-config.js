"use strict";

module.exports = {
    createMessageCycleLimit: 10,
    database: "testQueue",
    heartbeatCleanupDelayMs: 1,
    heartbeatLifetimeSeconds: 1,
    host: "localhost",
    owner: "tester",
    pollingDelayMs: 150,
    port: 3306,
    table: "queue",
    topics: "Test Topic",
    user: "root"
};
