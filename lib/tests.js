"use strict";


/**
 * Creates a test object.
 *
 * @param {assert} assert
 * @param {Object} config
 * @param {Object} Plugin DDQ instance being tested.
 * @return {ddqBackendTests.test}
 */
module.exports = (assert, config, Plugin) => {
    var instance;

    instance = new Plugin(config);


    /**
     * Runs test on particular message. Blows up after 5 tries.
     * Sets up listener and calls callback when the necessary message is
     * emitted.
     *
     * @param {Function} callback
     */
    function runOnMessage(callback) {
        var runCounter;

        runCounter = 0;

        instance.on("data", (data) => {
            if (data.message === "message") {
                instance.stopListening();
                callback(null, data);
            } else {
                runCounter += 1;

                if (runCounter > 5) {
                    instance.stopListening();
                    callback(new Error("The test message was not found."));
                }
            }
        });

        instance.startListening();
    }


    /**
     * Sets up a listener and when the proper test message is emitted
     * it requeue it.
     *
     * @param {Function} callback
     */
    function runRequeue(callback) {
        console.log("Starting requeue test");
        runOnMessage((err, data) => {
            if (err) {
                callback(err);

                return;
            }

            data.requeue((rqErr) => {
                instance.removeAllListeners("data");
                callback(rqErr);
            });
        });
    }


    /**
     * Sets up a listener and when the proper test message is emitted
     * it calls heartbeat on it.
     *
     * @param {Function} callback
     */
    function runHeartbeat(callback) {
        console.log("Starting heartbeat test");
        runOnMessage((err, data) => {
            if (err) {
                callback(err);

                return;
            }

            data.heartbeat((rqErr) => {
                instance.removeAllListeners("data");
                callback(rqErr);
            });
        });
    }


    /**
     * Sets up a listener and removes the test message when it is emitted.
     *
     * @param {Function} callback
     */
    function runRemove(callback) {
        console.log("Starting removal test");
        runOnMessage((err, data) => {
            if (err) {
                callback(err);

                return;
            }

            data.remove((rqErr) => {
                instance.removeAllListeners("data");
                callback(rqErr);
            });
        });
    }


    /**
     * Tests to ensure multiple listeners don't get the same message
     * and that the locking mechanism is in fact working.
     *
     * @param {Function} callback
     */
    function multipleListeners(callback) {
        var accessed, accessedOnce, configTwo, instanceTwo;

        console.log("Setting multiple listeners for test.");
        accessed = false;
        accessedOnce = false;

        // Deep copy to ensure this isn't used globally.
        configTwo = JSON.parse(JSON.stringify(config));
        configTwo.owner = "testerTwo";
        instanceTwo = new Plugin(configTwo);


        /**
         * Deals with data returned by either listeners.
         *
         * @param {Object} data
         */
        function dealWithData(data) {
            console.log(`Retrieved message on mutliple listener test ${data.message}`);
            if (accessed) {
                instance.removeAllListeners();
                instanceTwo.removeAllListeners();
                callback(new Error("Same message processed by both listeners! Fail!"));
            } else {
                accessed = true;

                if (accessedOnce) {
                    console.log("Removing multiple listener test message");
                    data.remove((remErr) => {
                        callback(remErr);
                    });
                } else {
                    accessedOnce = true;

                    // Making sure same message isn't access twice until requeued.
                    // Giving it a somewhat arbitrary amount of time.
                    setTimeout(() => {
                        accessed = false;
                        data.requeue((reqErr) => {
                            if (reqErr) {
                                callback(reqErr);
                            }
                        });
                    }, 250);
                }
            }
        }

        instanceTwo.connect((conErr) => {
            if (conErr) {
                console.log("Error connecting to second instance.");
                instanceTwo.removeAllListeners();
                callback(conErr);

                return;
            }

            instance.on("data", (data) => {
                console.log(`First listener accessed message ${data.message}`);

                if (data.message === "multiMsg") {
                    instance.removeAllListeners();
                    instance.stopListening();
                    dealWithData(data);
                }
            });
            instanceTwo.on("data", (data) => {
                console.log(`Second listener accessed message ${data.message}`);

                if (data.message === "multiMsg") {
                    instanceTwo.removeAllListeners();
                    instanceTwo.stopListening();
                    dealWithData(data);
                }
            });
            instance.startListening();
            instanceTwo.startListening();
        });
    }


    /**
     * Uses multiple listeners to ensure both listeners do not get the same
     * message.
     *
     * @param {Function} callback
     */
    function multipleListenerTest(callback) {
        instance.on("error", (err) => {
            instance.removeAllListeners();
            callback(err);
        });
        instance.connect((err) => {
            if (err) {
                instance.removeAllListeners();
                callback(err);

                return;
            }

            console.log("Sending test message for multiple listener test.");
            instance.sendMessage("multiMsg", config.topics, (testErr) => {
                if (testErr) {
                    instance.removeAllListeners();
                    callback(testErr);

                    return;
                }

                multipleListeners((multiErr) => {
                    instance.removeAllListeners();
                    instance.disconnect();
                    callback(multiErr);
                });
            });
        });
    }


    /**
     * This tests the deduplication functionality. It ensures if a duplicate
     * message is sent, it is not inserted and requeued is set to true.
     * It also tests the requeued process. The "requeued" column exists because
     * we want to run a job one more time but only if the message is being
     * processed.
     *
     * @param {Function} callback
     */
    function deduplicationTest(callback) {
        var emitted, notRemoved;

        emitted = false;
        notRemoved = false;
        instance.on("error", (err) => {
            instance.removeAllListeners();
            callback(err);
        });
        instance.connect((err) => {
            if (err) {
                instance.removeAllListeners();
                callback(err);

                return;
            }

            console.log("Sending test message.");
            instance.sendMessage("message", config.topics, (testErr) => {
                if (testErr) {
                    callback(testErr);

                    return;
                }

                console.log("Test message inserted successfully");
            });
            console.log("Testing duplicate message");
            instance.on("data", (data) => {
                instance.sendMessage("message", config.topics, (fail) => {
                    if (fail && !fail.message === "Could not send message.") {
                        callback(new Error("Duplicate message was not rejected as expected."));
                    } else {
                        console.log("Duplicate message not inserted, which is expected.");
                        data.remove((remErr) => {
                            if (remErr) {
                                callback(remErr);
                            }

                            instance.removeAllListeners("data");

                            // Data listener below may get called if the remove above does not work properly.
                            // Waiting the heartbeatLifetime plus an extra second to ensure it is not emitted.
                            setTimeout(() => {
                                if (!emitted) {
                                    console.log("Requeued message was never emitted again for processing.");
                                    instance.stopListening();
                                    instance.removeAllListeners();
                                    callback(new Error("Duplicate message caused a requeue but message was not emitted for processing a second time."));
                                }
                            }, config.heartbeatLifetimeSeconds * 1000 + config.pollingDelayMs);
                            instance.on("data", (moreData) => {
                                if (moreData.message === "message") {
                                    console.log("Processed requeued message. Removing it for reals now.");
                                    emitted = true;

                                    // Making sure the record isn't emitted again.
                                    setTimeout(() => {
                                        if (!notRemoved) {
                                            console.log("Data was removed as expected for the deduplication test.");
                                            instance.stopListening();
                                            instance.disconnect();
                                            instance.removeAllListeners();
                                            callback();
                                        }
                                    }, config.heartbeatLifetimeSeconds * 1000 + 1000);
                                    moreData.remove((emErr) => {
                                        if (emErr) {
                                            callback(emErr);
                                        }

                                        // Super fun we get to setup another listener to see if it was actually removed.
                                        instance.on("data", (evenMoreData) => {
                                            if (evenMoreData.message === "message") {
                                                notRemoved = true;
                                                instance.stopListening();
                                                instance.removeAllListeners();
                                                instance.disconnect();
                                                callback(new Error("Data was not removed as expected."));
                                            }
                                        });
                                    });
                                }
                            });
                        });
                    }
                });
            });
            instance.startListening();
        });
    }


    /**
     * Tests wrapped messages, tests heartbeat, requeue, and remove.
     * Tests heartbeat cleanup works as expected by asserting message is not
     * made available again until after the heartbeat life time has elapsed.
     *
     * @param {Function} callback
     */
    function wrappedMessageTest(callback) {
        var cleanupElapsed;

        cleanupElapsed = false;
        instance.on("error", (err) => {
            instance.removeAllListeners();
            callback(err);
        });
        instance.connect((err) => {
            if (err) {
                instance.removeAllListeners();
                callback(err);

                return;
            }

            console.log("Sending test message.");
            instance.sendMessage("message", config.topics, (testErr) => {
                if (testErr) {
                    callback(testErr);

                    return;
                }

                console.log("Test message inserted successfully");
                runRequeue((reErr) => {
                    if (reErr) {
                        callback(reErr);

                        return;
                    }

                    // Ensure heartbeat cleanup works. I set cleanupElapsed
                    // to true after the heartbeatLifetimeSeconds elapses and
                    // thus the heartbeatCleanup is run and the message is
                    // emitted again. If the message is emitted before that
                    // point the test will fail. The core DDQ does not of
                    // course work like this in any way. This is just a method
                    // of testing the heartbeat lifetime works as it should.
                    setTimeout(() => {
                        cleanupElapsed = true;
                        console.log("Heartbeat lifetime time elapsed!");
                    }, instance.config.heartbeatLifetimeSeconds * 1000);
                    runHeartbeat((hbErr) => {
                        if (hbErr) {
                            callback(hbErr);

                            return;
                        }

                        runRemove((removeErr) => {
                            if (cleanupElapsed) {
                                callback(removeErr);
                            } else {
                                callback(new Error("Heartbeat cleanup time elapsed but record was made available before that."));
                            }
                        });
                    });
                });
            });
        });
    }

    return {
        deduplicationTest,
        multipleListenerTest,
        wrappedMessageTest
    };
};
