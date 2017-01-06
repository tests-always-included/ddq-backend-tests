"use strict";

module.exports = {
    backendConfig: {
        createMessageCycleLimit: 10,
        database: "testQueue",
        heartbeatCleanupDelayMs: 15000,
        heartbeatLifetimeSeconds: 5,
        host: "localhost",
        pollingDelayMs: 15000,
        port: 3306,
        table: "queue",
        topic: "Test Topic",
        user: "root"
    },
    heartbeatDelayMs: 1000,
    maxProcessingMessages: 10
};
