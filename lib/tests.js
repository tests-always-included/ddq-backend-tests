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
     * Runs polling test.
     *
     * @param {Function} callback
     */
    function pollingTest(callback) {
        var instanceProperties;

        instanceProperties = [
            "currentlyPolling",
            "currentlyRestoring",
            "poller",
            "restorer"
        ];


        /**
         * Assert properties in batches.
         *
         * @param {string[]} properties
         * @param {*} [shouldExist] asserts the properties exist or does not exist.
         */
        function assertProperties(properties, shouldExist) {
            properties.forEach((property) => {
                if (shouldExist) {
                    assert(instance[property]);
                } else {
                    assert(!instance[property]);
                }
            });
        }


        /**
         * Starts and stops listening while asserting properties.
         *
         * @param {Function} done
         */
        function startStopAssert(done) {
            instance.startListening(() => {
                assertProperties(instanceProperties, true);
                instance.stopListening(() => {
                    assertProperties(instanceProperties);
                    done();
                });
            });
        }

        assertProperties(instanceProperties);
        instance.connect((connectErr) => {
            if (connectErr) {
                console.log("There was a connection error");
                callback(connectErr);

                return;
            }

            // Assert properties twice to ensure it works properly.
            startStopAssert(() => {
                startStopAssert(() => {
                    callback();
                });
            });
        });
    }


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
            instance.stopListening();

            if (data.message === "message") {
                callback(null, data);
            } else {
                runCounter += 1;

                if (runCounter > 5) {
                    callback(new Error("The test message was not found."));
                }
            }
        });

        instance.startListening();
    }


    /**
     * Requeue test.
     *
     * @param {Function} callback
     */
    function requeue(callback) {
        console.log("Starting requeue test");
        runOnMessage((err, data) => {
            if (err) {
                callback(err);
            }

            data.requeue((rqErr) => {
                instance.removeAllListeners("data");
                callback(rqErr);
            });
        });
    }


    /**
     * Runs heartbeat test.
     *
     * @param {Function} callback
     */
    function heartbeat(callback) {
        console.log("Starting heartbeat test");
        runOnMessage((err, data) => {
            if (err) {
                callback(err);
            }

            data.heartbeat((rqErr) => {
                instance.removeAllListeners("data");
                callback(rqErr);
            });
        });
    }


    /**
     *  Removes test message.
     *
     * @param {Function} callback
     */
    function remove(callback) {
        console.log("Starting removal test");
        runOnMessage((err, data) => {
            if (err) {
                callback(err);
            }

            data.remove((rqErr) => {
                instance.removeAllListeners();
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
        var accessed, instanceTwo;

        console.log("Setting multiple listeners for test.");
        accessed = false;
        config.owner = "testerTwo";
        instanceTwo = new Plugin(config);


        /**
         * Deals with data returned by either listeners.
         *
         * @param {Object} data
         */
        function dealWithData(data) {
            console.log(`Retrieved message on mutliple listener test ${data.message}`);
            if (!accessed && data.message === "multiMsg") {
                accessed = true;
            } else if (accessed && data.message === "multiMsg") {
                instance.removeAllListeners();
                instanceTwo.removeAllListeners();
                callback(new Error("Same message processed by both listeners! Fail!"));
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
                dealWithData(data);

                // Making sure same message isn't access twice until requeued.
                // Giving it a somewhat arbitrary amount of time.
                setTimeout(() => {
                    accessed = false;
                    console.log("Requeue for second listener to consume");
                    data.requeue((reqErr) => {
                        if (reqErr) {
                            callback(reqErr);

                            return;
                        }
                    });
                }, 250);
                instance.removeAllListeners();
            });
            instanceTwo.on("data", (data) => {
                console.log(`Second listener accessed message ${data.message}`);
                dealWithData(data);
                console.log("Removing multiple listener test message");
                data.remove((remErr) => {
                    if (remErr) {
                        callback(remErr);

                        return;
                    }
                    callback();
                });
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
            callback(err);
            instance.removeAllListeners();
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
            callback(err);
            instance.removeAllListeners();
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
                requeue((reErr) => {
                    if (reErr) {
                        callback(reErr);

                        return;
                    }

                    // Ensure heartbeat cleanup works. If so I will get
                    // the same message as above after the allotted time
                    // and I can then remove it.
                    setTimeout(() => {
                        cleanupElapsed = true;
                        console.log("Heartbeat lifetime time elapsed!");
                    }, instance.config.heartbeatLifetimeSeconds * 1000);
                    heartbeat((hbErr) => {
                        if (hbErr) {
                            callback(hbErr);

                            return;
                        }

                        remove((removeErr) => {
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
        pollingTest,
        multipleListenerTest,
        wrappedMessageTest
    };
};
