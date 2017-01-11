DDQ Backend Functional Tests
============================

[![npm version][npm-badge]][npm-link]
[![Build Status][travis-badge]][travis-link]
[![Dependencies][dependencies-badge]][dependencies-link]
[![Dev Dependencies][devdependencies-badge]][devdependencies-link]
[![Build Status][travis-badge]][travis-link]
[![Dependencies][dependencies-badge]][dependencies-link]
[![Dev Dependencies][devdependencies-badge]][devdependencies-link]sssnpm version][npm-badge]][npm-link]
[![Build Status][travis-badge]][travis-link]
[![Dependencies][dependencies-badge]][dependencies-link]
[![Dev Dependencies][devdependencies-badge]][devdependencies-link]

Contains functional tests meant to be used by DDQ backend plugins. One example is [DDQ MySql Plugin](https://github.com/tests-always-included/ddq-backend-mysql).


Usage
-----

Add this package as a devDependency and you can run the test script as part of your build process. You simply run the `run-test.sh` script. Here is an example with Travis and MySql.

    services:
        - mysql
    before_script:
        - bash script/mysql-commands.sh
    script:
        - bash node_modules/ddq-backend-tests/run-tests.sh

The script referenced above runs a setup file for MySql. Again these are just examples for MySql.

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

Also see the manual test config for the test configuration [here](script/manual-testing-config.js).

[codecov-badge]: https://img.shields.io/codecov/c/github/tests-always-included/ddq-backend-tests/master.svg
[codecov-link]: https://codecov.io/github/tests-always-included/ddq-backend-tests?branch=master
[dependencies-badge]: https://img.shields.io/david/tests-always-included/ddq-backend-tests.svg
[dependencies-link]: https://david-dm.org/tests-always-included/ddq-backend-tests
[devdependencies-badge]: https://img.shields.io/david/dev/tests-always-included/ddq-backend-tests.svg
[devdependencies-link]: https://david-dm.org/tests-always-included/ddq-backend-tests#info=devDependencies
[npm-badge]: https://img.shields.io/npm/v/ddq-backend-tests.svg
[npm-link]: https://npmjs.org/package/ddq-backend-tests
[travis-badge]: https://img.shields.io/travis/tests-always-included/ddq-backend-tests/master.svg
[travis-link]: http://travis-ci.org/tests-always-included/ddq-backend-tests

