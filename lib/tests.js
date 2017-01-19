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
            "poller",
            "restorer"
        ];


        /**
         * Assert properties in batches.
         *
         * @param {Array} properties
         * @param {*} [flag] If set, asserts true for falsy values
         */
        function assertProperties(properties, flag) {
            properties.forEach((property) => {
                if (!flag) {
                    if (!instance[property]) {
                        callback(new Error(`Assertion error, ${property} exists on instance and should not.`));
                    }
                } else if (instance[property]) {
                    callback(new Error(`Assertion error, ${property} does not exist on instance and should.`));
                }
            });
        }

        assertProperties(instanceProperties, true);
        console.log("Calling the listen method");
        instance.connect((connectErr) => {
            if (connectErr) {
                console.log("There was a connection error");

                callback(new Error(connectErr));
            }

            console.log("Connection was successfully made");
            instance.startListening(() => {
                assertProperties(instanceProperties);
                instance.stopListening(() => {
                    assertProperties(instanceProperties, true);
                    instance.startListening(() => {
                        assertProperties(instanceProperties);
                        instance.stopListening(() => {
                            assertProperties(instanceProperties, true);
                            callback();
                        });
                    });
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
     * Tests wrapped messages, tests heartbeat, requeue, and remove.
     * Relies on the message inserted by send message test.
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
            instance.sendMessage("message", "Test Topic", (testErr) => {
                if (testErr) {
                    callback(testErr);
                } else {
                    console.log("Test message inserted successfully");
                    requeue((reErr) => {
                        if (reErr) {
                            callback(reErr);
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
                }
            });
        });
    }

    return {
        pollingTest,
        wrappedMessageTest
    };
};
