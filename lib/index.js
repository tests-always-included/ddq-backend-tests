"use strict";

var assert, config, Plugin, tests;

assert = require("assert");
config = require("./manual-testing-config");
Plugin = require(process.cwd());
tests = require("./tests")(assert, config, Plugin);


/**
 * @typedef {Object} ddqBackendTests.tester
 * @property {Function} runAllTests
 * @property {boolean} errored
 * @property {ddqBackendTests.tests} tests
 */

/**
 * @return {ddqBackendTests.tester}
 */
module.exports = () => {
    /**
     * Class that is created to run backend plugin tests.
     */
    class BackendTester {
        /**
         * Determines which test to run and initializes variables required for
         * running tests.
         */
        constructor() {
            this.errored = false;
            this.tests = tests;
            this.testsToRun = Object.keys(this.tests);
            this.testIndex = 0;
        }


        /**
         * Wraps up the tests once they are all run and calls callback.
         *
         * @param {Function} callback
         */
        complete(callback) {
            this.testIndex = 0;

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
         * @param {integer} [timeout] in ms, defaults to 30000.
         */
        runAllTests(callback, timeout) {
            if (!timeout) {
                // 30 seconds should be more then enough time to run these
                // tests either locally or on Travis. If more time consuming
                // tests are added please update this default.
                timeout = 90000;
            }

            setTimeout(() => {
                throw new Error(`Timeout of ${timeout} ms was reached. Tests failed.`);
            }, timeout);

            this.runNext(callback);
        }


        /**
         * Runs next test it is recursive. You call it once and it calls itself
         * until it exhuasts all of the tests to run.
         *
         * @param {Function} callback
         */
        runNext(callback) {
            var test;

            test = this.testsToRun[this.testIndex];
            this.tests[test]((err) => {
                if (err) {
                    console.error(`Failed to run ${test}`);
                    console.error(err);
                    this.errored = true;
                } else {
                    console.log(`Successfully ran ${test}`);
                }

                this.testIndex += 1;

                if (this.testIndex >= this.testsToRun.length) {
                    this.complete(callback);
                } else {
                    this.runNext(callback);
                }
            });
        }
    }

    return BackendTester;
};
