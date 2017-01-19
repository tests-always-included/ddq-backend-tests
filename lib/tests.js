"use strict";


/**
 * Creates a test object.
 *
 * @param {assert} assert
 * @param {Object} config
 * @param {Object} plugin DDQ plugin being tested.
 * @return {ddqBackendTests.test}
 */
module.exports = (assert, config, plugin) => {
    /**
     * Runs polling test.
     *
     * @param {Function} callback
     */
    function pollingTest(callback) {
        var pluginProperties;

        pluginProperties = [
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
                    if (!plugin[property]) {
                        callback(new Error(`Assertion error, ${property} exists on plugin and should not.`));
                    }
                } else if (plugin[property]) {
                    callback(new Error(`Assertion error, ${property} does not exist on plugin and should.`));
                }
            });
        }

        assertProperties(pluginProperties, true);
        console.log("Calling the listen method");
        plugin.connect((connectErr) => {
            if (connectErr) {
                console.log("There was a connection error");

                callback(new Error(connectErr));
            }

            console.log("Connection was successfully made");
            plugin.startListening(() => {
                assertProperties(pluginProperties);
                plugin.stopListening(() => {
                    assertProperties(pluginProperties, true);
                    plugin.startListening(() => {
                        assertProperties(pluginProperties);
                        plugin.stopListening(() => {
                            assertProperties(pluginProperties, true);
                            callback();
                        });
                    });
                });
            });
        });
    }


    /**
     * Initiates testing of wrapped message.
     *
     * @param {Function} callback
     */
    function heartbeatRequeue(callback) {
        var runCounter;

        runCounter = 0;

        plugin.on("data", (data) => {
            plugin.stopListening();
            console.log("Running heartbeat and requeue test.");

            if (data.message === "message") {
                data.heartbeat((err) => {
                    if (err) {
                        callback(err);
                    }

                    data.requeue((requeueErr) => {
                        plugin.removeAllListeners("data");
                        callback(requeueErr);
                    });
                });
            } else {
                runCounter += 1;

                if (runCounter > 5) {
                    callback(new Error("The test message was not found."));
                }
            }
        });
    }


    /**
     *  Removes test message.
     *
     * @param {Function} callback
     */
    function remove(callback) {
        var runCounter;

        runCounter = 0;

        plugin.on("data", (data) => {
            console.log("Running remove test.");

            if (data.message === "message") {
                data.remove((err) => {
                    plugin.removeAllListeners();
                    callback(err);
                });
            } else {
                runCounter += 1;

                if (runCounter > 5) {
                    callback(new Error("The test message was not found."));
                }
            }
        });
    }


    /**
     * Tests wrapped messages, tests heartbeat, requeue, and remove.
     * Relies on the message inserted by send message test.
     *
     * @param {Function} callback
     */
    function wrappedMessageTest(callback) {
        plugin.on("error", (err) => {
            callback(err);
            plugin.removeAllListeners();
        });
        plugin.connect((err) => {
            if (err) {
                plugin.removeAllListeners();
                callback(err);

                return;
            }

            plugin.startListening();
            plugin.sendMessage("message", "Test Topic", (testErr) => {
                if (testErr) {
                    callback(testErr);
                }
            });
            heartbeatRequeue((hbErr) => {
                if (hbErr) {
                    callback(hbErr);
                }

                plugin.startListening();
                remove((removeErr) => {
                    callback(removeErr);
                });
            });
        });
    }

    return {
        pollingTest,
        wrappedMessageTest
    };
};
