"use strict";

module.exports = {
    createMessageCycleLimit: 10,
    database: "testQueue",
    deadlockCountLimit: 5,
    heartbeatCleanupDelayMs: 500,
    heartbeatLifetimeSeconds: 1,
    host: "localhost",
    owner: "tester",
    pollingDelayMs: 500,
    port: 3306,
    table: "queue",
    topics: "Test Topic",
    password: "root",
    user: "root"
};
