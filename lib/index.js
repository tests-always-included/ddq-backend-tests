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
         * Wraps up the tests once they are all run and calls callback.
         *
         * @param {Function} callback
         */
        complete(callback) {
            if (this.errored) {
                callback(Error("Backend functional test failed."));
            } else {
                callback();
            }
        }


        /**
         * Runs all backend plugin tests and calls supplied callback.
         *
         * @param {Function} callback
         */
        runAllTests(callback) {
            var testCount, testsToRun;

            testsToRun = Object.keys(tests);
            testCount = testsToRun.length;

            testsToRun.forEach((test) => {
                tests[test]((err) => {
                    if (err) {
                        console.error(`Failed to run ${test}`);
                        console.error(err);
                        this.errored = true;
                    } else {
                        console.log(`Successfully ran ${test}`);
                    }

                    testCount -= 1;

                    if (testCount < 1) {
                        this.complete(callback);
                    }
                });
            });
        }
    }

    return BackendTester;
};
