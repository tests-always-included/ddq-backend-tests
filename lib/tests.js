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
                if (flag) {
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
                            plugin.disconnect((err) => {
                                if (err) {
                                    console.log("There was a problem disconnecting");
                                    callback(new Error(err));
                                } else {
                                    console.log("Disconnected successfully");
                                    callback();
                                }
                            });
                        });
                    });
                });
            });
        });
    }


    /**
     * Runs send message test.
     *
     * @param {Function} callback
     */
    function sendMessageTest(callback) {
        plugin.connect((connectErr) => {
            if (connectErr) {
                console.error("There was a connection error");
                callback(connectErr);

                return;
            }

            plugin.sendMessage("Test Message", "Test Topic", (testErr) => {
                if (testErr) {
                    callback(testErr);

                    return;
                }

                plugin.disconnect(callback);
            });
        });
    }


    /**
     * Instantiates and preps the plugin for testing. The "data" event listener will
     * call the wrapped message function and initiate cleanup on success.
     *
     * @param {Function} fn The function that is to be tested.
     * @param {Function} done
     */
    function wrappedMessageTest(fn, done) {
        plugin.on("data", (data) => {
            console.log("Wrapped message test data listener activated.");
            plugin.stopListening();
            data[fn]((err) => {
                plugin.removeAllListeners();
                done(err);
            });
        });
        plugin.on("error", (err) => {
            done(err);
            plugin.removeAllListeners();
        });
        plugin.connect((err) => {
            if (err) {
                plugin.removeAllListeners();
                done(err);
            } else {
                plugin.startListening();
            }
        });
    }


    /**
     * Runs heartbeat test.
     *
     * @param {Function} callback
     */
    function heartbeatTest(callback) {
        wrappedMessageTest("heartbeat", (err) => {
            if (err) {
                callback(err);

                return;
            }

            callback();
        });
    }


    /**
     * Runs requeue test.
     *
     * @param {Function} callback
     */
    function requeueTest(callback) {
        wrappedMessageTest("requeue", (err) => {
            if (err) {
                callback(err);
            }

            callback();
        });
    }


    /**
     * Runs remove test.
     *
     * @param {Function} callback
     */
    function removeTest(callback) {
        wrappedMessageTest("remove", (err) => {
            if (err) {
                callback(err);
            }

            callback();
        });
    }

    return {
        heartbeatTest,
        pollingTest,
        removeTest,
        requeueTest,
        sendMessageTest
    };
};
