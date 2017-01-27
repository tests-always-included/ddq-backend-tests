DDQ Backend Functional Tests
============================

[![npm version][npm-badge]][npm-link]
[![Build Status][travis-badge]][travis-link]
[![Dependencies][dependencies-badge]][dependencies-link]
[![Dev Dependencies][devdependencies-badge]][devdependencies-link]

Contains functional tests meant to be used by DDQ backend plugins. One example is [DDQ MySQL Plugin](https://github.com/tests-always-included/ddq-backend-mysql).


Tests
-----

* `ddqBackendTests.tests.deduplicationTest` ensures when a duplicate message is sent, it is not inserted and the original message is "requeued" and processed again.

* `ddqBackendTests.tests.mutlipleListenerTest` sets up multiple listeners and makes certain messages are not emitted to both listeners. It then requeues the message from the listener to first process the message, the second processor of the message then removes it.

* `ddqBackendTests.tests.wrappedMessageTest` is the more basic of these tests. It tests requeue, heartbeat, and remove. After heartbeat it ensures the heartbeat lifetime elapsed before the message is removed.


Usage
-----

Add this package under devDependencies and use the module to run solitary tests or all at once.

    var BackendTester, exit, tester;

    exit = process.exit;
    BackendTester = require("ddq-backend-tests")();
    tester = new BackendTester();
    tester.runAllTests((testErr) => {
        if (testErr) {
            console.error("Error occurred running DDQ backend functional tests.");

            throw testErr;
        }

        console.log("Successfully ran backend plugin functional tests");
        exit(0);
    });

    // For a single test.
    tester.tests.wrappedMessageTest(() => {});


The test queue must be setup prior to running these tests. We wrote one plugin in MySQL and here is how we setup our test queue.

    DROP DATABASE IF EXISTS testQueue;
    CREATE DATABASE testQueue;
    USE testQueue;
    CREATE TABLE queue (
        hash CHAR(64),
        PRIMARY KEY(hash),
        message VARCHAR(120) NOT NULL,
        requeued BOOLEAN DEFAULT FALSE,
        heartbeatDate DATETIME,
        owner VARCHAR(256),
        isProcessing BOOLEAN DEFAULT FALSE,
        INDEX isProcessing(isProcessing),
        topic VARCHAR(256),
        messageBase64 VARCHAR(256)
    );

The configuration that is used for functional tests can be found [here](lib/manual-testing-config.js).

[dependencies-badge]: https://img.shields.io/david/tests-always-included/ddq-backend-tests.svg
[dependencies-link]: https://david-dm.org/tests-always-included/ddq-backend-tests
[devdependencies-badge]: https://img.shields.io/david/dev/tests-always-included/ddq-backend-tests.svg
[devdependencies-link]: https://david-dm.org/tests-always-included/ddq-backend-tests#info=devDependencies
[npm-badge]: https://img.shields.io/npm/v/ddq-backend-tests.svg
[npm-link]: https://npmjs.org/package/ddq-backend-tests
[travis-badge]: https://img.shields.io/travis/tests-always-included/ddq-backend-tests/master.svg
[travis-link]: http://travis-ci.org/tests-always-included/ddq-backend-tests

