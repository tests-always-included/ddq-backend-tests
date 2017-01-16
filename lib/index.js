"use strict";

var assert, config, instance, Plugin, tests;

assert = require("assert");
config = require("./manual-testing-config");
Plugin = require(process.cwd());
instance = new Plugin(config);
tests = require("./tests")(assert, config, instance);


/**
 * @typedef {Object} ddqBackendTests.tester
 * @property {Function} runAllTests
 * @property {boolean} errored
 * @property {ddqBackendTests.tests} tests
 */

/**
 * Creates a functional tester.
 *
 * @return {ddqBackendTests.tester}
 */
module.exports = () => {
    /**
     * Class that is created to run backend plugin tests.
     */
    class BackendTester {
        /**
         * Constructs backend tester instance.
         */
        constructor() {
            // I want to run all tests before throwing an error.
            this.errored = false;
            this.tests = tests;
        }


        /**
         * Runs all backend plugin tests.
         *
         * @param {Function} callback
         */
        runAllTests(callback) {
            Object.keys(tests).forEach((test) => {
                tests[test]((err) => {
                    if (err) {
                        console.error(`Failed to run ${test}`);
                        console.error(err);
                        this.errored = true;
                    } else {
                        console.log(`Successfully ran ${test}`);
                    }
                });
            });

            if (this.errored) {
                callback(Error("Backend functional test failed."));
            } else {
                callback();
            }
        }
    }

    return BackendTester;
};
