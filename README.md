DDQ Backend Functional Tests
============================

[![Build Status](https://travis-ci.org/not-nexus/shelf.svg?branch=master)](https://travis-ci.org/not-nexus/shelf)

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

