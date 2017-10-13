'use strict';

require('mocha');
const IngoToZimbraConverter = require('../src/IngoToZimbraRuleConverter');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const sinonStubPromse = require('sinon-stub-promise');

// noinspection JSUnresolvedVariable
const expect = chai.expect;
sinonStubPromse(sinon);
chai.use(sinonChai);
// noinspection JSUnresolvedVariable
sinon.assert.expose(chai.assert, {prefix: ""});

describe('IngoToZimbraConverter', () => {
    context('when initialised with a command line interface', () => {
        it('sets the script version', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator, BadExpressionStatementJS
            expect(commandLineInterface.version).to.have.been.called;
        });

        it('sets the application description version', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator
            expect(commandLineInterface.description).to.have.been.calledWith("Read Horde / Ingo rules from the preferences database and write a script which can be piped to Zimbra's zmprov command.");
        });

        it('expects the mailbox argument', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator
            expect(commandLineInterface.arguments).to.have.been.calledWith('<mailbox>');
        });

        it('expects the database host option', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator
            expect(commandLineInterface.option).to.have.been.calledWith('-H, --database-host <host>', 'Database host (default localhost)');
        });

        it('expects the database port option', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator
            expect(commandLineInterface.option).to.have.been.calledWith('-P, --database-port <port>', 'Database port (default 3306)');
        });

        it('expects the database option', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator
            expect(commandLineInterface.option).to.have.been.calledWith('-d, --database <database>', 'Database name (default horde)');
        });

        it('expects the database user option', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator
            expect(commandLineInterface.option).to.have.been.calledWith('-u, --database-user <user>', 'Database user name');
        });

        it('expects the database password option', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator
            expect(commandLineInterface.option).to.have.been.calledWith('-p, --database-password <password>', 'Database password');
        });

        it('expects the debug flag', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator
            expect(commandLineInterface.option).to.have.been.calledWith('-D, --debug', 'Write warnings when skipping invalid or unwanted rules');
        });

        it('sets a callback action for the command line interface', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator, BadExpressionStatementJS
            expect(commandLineInterface.action).to.have.been.called;
        });

        it('parses the command line arguments', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable, JSAnnotator, BadExpressionStatementJS
            expect(commandLineInterface.parse).to.have.been.calledWith(process.argv);
        });

        it('queries the database for the Ingo preferences for the given mailbox using its local part as ID', () => {
            const query = 'SELECT pref_uid AS mailbox_id, pref_value as rules ' +
                'FROM horde_prefs ' +
                'WHERE pref_uid = ? ' +
                'AND pref_scope = ? ' +
                'AND pref_name = ?';

            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(databaseInstance.exec).to.have.been.calledWith(query, ['foo', 'ingo', 'rules']);
        });

        it('normalizes Unicode characters in the rule string for compatiblity', () => {
            const rules = {
                normalize: sandbox.stub().returnsThis(),
                replace: sandbox.stub().returnsThis()
            };
            databaseInstance.exec = sandbox.stub().returnsPromise().resolves([{rules: rules}]);
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(rules.normalize).to.have.been.calledWith('NFKD');
        });

        it('fixes the incorrect string lengths in the rule string after normalizing it', () => {
            const normalizedString = {
                replace: sandbox.stub().returnsThis()
            };
            const rules = {
                normalize: sandbox.stub().returns(normalizedString),
            };
            databaseInstance.exec = sandbox.stub().returnsPromise().resolves([{rules: rules}]);
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(normalizedString.replace).to.have.been.calledWith(/s:(\d+):"(.*?)";/gu, sinon.match.any);
        });

        it('uses the PHP serializer polyfill to unserialize the rules', () => {
            const rules = '{s:10:"Some Rules"}';
            phpSerializer.unserialize = sandbox.stub().returns(returnedRules);
            databaseInstance.exec = sandbox.stub().returnsPromise().resolves([{rules: rules}]);
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(phpSerializer.unserialize).to.have.been.calledWith(rules);
        });
    });

    context('when valid rules are returned', () => {
        it('writes out a command to set the mailbox', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('sm foo@bar.com \n');
        });

        it('includes two exit statements to make sure that zmprov exits automatically', () => {
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('exit\nexit\n');
        });

        it('translates action 1 to a keep rule', () => {
            returnedRules = [
                {
                    action: '1',
                    'action-value': null,
                    combine: '1',
                    conditions: [
                        {
                            field: 'From',
                            match: 'is',
                            value: 'bar@baz.com'
                        }
                    ],
                    name: 'The Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "The Rule" active all address "From" all is "bar@baz.com"  keep  \n');
        });

        it('translates action 1 with stop to a keep rule with stop', () => {
            returnedRules = [
                {
                    action: '1',
                    'action-value': null,
                    combine: '2',
                    conditions: [
                        {
                            field: 'From',
                            match: 'contains',
                            value: 'baz@baz.com'
                        }
                    ],
                    name: 'Another Rule',
                    stop: '1'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "Another Rule" active any address "From" all contains "baz@baz.com"  keep  stop\n');
        });

        it('translates action 2 to a fileinto rule', () => {
            returnedRules = [
                {
                    action: '2',
                    'action-value': 'Some/Folder',
                    combine: '2',
                    conditions: [
                        {
                            field: 'From',
                            match: 'contains',
                            value: 'baz@baz.com'
                        },
                        {
                            field: 'Subject',
                            match: 'contains',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active any address "From" all contains "baz@baz.com" header "subject"  contains "SOMETHING"  fileinto "Some/Folder" \n');
        });

        it('translates action 3 to a discard rule', () => {
            returnedRules = [
                {
                    action: '3',
                    'action-value': null,
                    combine: '2',
                    conditions: [
                        {
                            field: 'From',
                            match: 'contains',
                            value: 'baz@baz.com'
                        },
                        {
                            field: 'Subject',
                            match: 'contains',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: '1'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active any address "From" all contains "baz@baz.com" header "subject"  contains "SOMETHING"  discard  stop\n');
        });

        it('translates action 4 to a discard rule', () => {
            returnedRules = [
                {
                    action: '4',
                    'action-value': 'foo@foo.com',
                    combine: '1',
                    conditions: [
                        {
                            field: 'Subject',
                            match: 'contains',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: '1'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active all header "subject"  contains "SOMETHING"  redirect "foo@foo.com" stop\n');
        });

        it('translates action 5 to a keep redirect rule', () => {
            returnedRules = [
                {
                    action: '5',
                    'action-value': 'foo@foo.com',
                    combine: '1',
                    conditions: [
                        {
                            field: 'Subject',
                            match: 'contains',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: '1'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active all header "subject"  contains "SOMETHING"  keep redirect "foo@foo.com" stop\n');
        });

        it('translates action 6 to a discard rule', () => {
            returnedRules = [
                {
                    action: '6',
                    'action-value': 'foo@foo.com',
                    combine: '1',
                    conditions: [
                        {
                            field: 'Subject',
                            match: 'contains',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: '1'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active all header "subject"  contains "SOMETHING"  discard  stop\n');
        });

        it('translates action 11 to a keep fileinto rule', () => {
            returnedRules = [
                {
                    action: '11',
                    'action-value': 'Another/Folder',
                    combine: '1',
                    conditions: [
                        {
                            field: 'Subject',
                            match: 'contains',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: '1'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active all header "subject"  contains "SOMETHING"  keep fileinto "Another/Folder" stop\n');
        });

        it('translates action 12 to a keep fileinto rule', () => {
            returnedRules = [
                {
                    action: '12',
                    'action-value': 'SomeFlag',
                    combine: '1',
                    conditions: [
                        {
                            field: 'Subject',
                            match: 'contains',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: '1'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active all header "subject"  contains "SOMETHING"  flag "SomeFlag" stop\n');
        });

        it('ignores incomplete conditions', () => {
            returnedRules = [
                {
                    action: '1',
                    'action-value': null,
                    combine: '2',
                    conditions: [
                        {
                            field: 'From',
                            match: 'contains',
                            value: ''
                        },
                        {
                            field: 'From',
                            match: 'is',
                            value: 'bar@baz.com'
                        }
                    ],
                    name: 'The Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "The Rule" active all address "From" all is "bar@baz.com"  keep  \n');
        });

        it('ignores unsupported "regex" conditions', () => {
            returnedRules = [
                {
                    action: '1',
                    'action-value': null,
                    combine: '2',
                    conditions: [
                        {
                            field: 'From',
                            match: 'regex',
                            value: 'foo@foo.com'
                        },
                        {
                            field: 'From',
                            match: 'is',
                            value: 'bar@bar-regex.com'
                        }
                    ],
                    name: 'The Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "The Rule" active any address "From" all is "bar@bar-regex.com"  keep  \n');
        });

        it('ignores unsupported "less" conditions', () => {
            returnedRules = [
                {
                    action: '1',
                    'action-value': null,
                    combine: '2',
                    conditions: [
                        {
                            field: 'From',
                            match: 'less',
                            value: 'foo@foo.com'
                        },
                        {
                            field: 'From',
                            match: 'is',
                            value: 'bar@bar-less.com'
                        }
                    ],
                    name: 'The Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "The Rule" active any address "From" all is "bar@bar-less.com"  keep  \n');
        });

        it('ignores unsupported "greater" conditions', () => {
            returnedRules = [
                {
                    action: '1',
                    'action-value': null,
                    combine: '2',
                    conditions: [
                        {
                            field: 'From',
                            match: 'greater',
                            value: 'foo@foo.com'
                        },
                        {
                            field: 'From',
                            match: 'is',
                            value: 'bar@bar-greater.com'
                        }
                    ],
                    name: 'The Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "The Rule" active any address "From" all is "bar@bar-greater.com"  keep  \n');
        });

        it('remaps "begins with" matches to "contains"', () => {
            returnedRules = [
                {
                    action: '3',
                    'action-value': null,
                    combine: '1',
                    conditions: [
                        {
                            field: 'Subject',
                            match: 'begins with',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active all header "subject"  contains "SOMETHING"  discard  \n');
        });

        it('remaps "ends with" matches to "contains"', () => {
            returnedRules = [
                {
                    action: '3',
                    'action-value': null,
                    combine: '1',
                    conditions: [
                        {
                            field: 'Subject',
                            match: 'ends with',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active all header "subject"  contains "SOMETHING"  discard  \n');
        });

        it('remaps "equal" matches to "is"', () => {
            returnedRules = [
                {
                    action: '3',
                    'action-value': null,
                    combine: '1',
                    conditions: [
                        {
                            field: 'Subject',
                            match: 'ends with',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active all header "subject"  contains "SOMETHING"  discard  \n');
        });

        it('remaps "not contain" matches to "not_contains"', () => {
            returnedRules = [
                {
                    action: '3',
                    'action-value': null,
                    combine: '1',
                    conditions: [
                        {
                            field: 'Subject',
                            match: 'not contain',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'A Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Rule" active all header "subject"  not_contains "SOMETHING"  discard  \n');
        });

        it('remaps "exists" matches with action value to "contains"', () => {
            returnedRules = [
                {
                    action: '3',
                    'action-value': null,
                    combine: '1',
                    conditions: [
                        {
                            field: 'Subject',
                            match: 'exists',
                            value: 'SOMETHING'
                        }
                    ],
                    name: 'An Exists Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "An Exists Rule" active all header "subject"  contains "SOMETHING"  discard  \n');
        });

        it('translates size rules with greater than matchers into the correct Zimbra format', () => {
            returnedRules = [
                {
                    action: '3',
                    'action-value': null,
                    combine: '1',
                    conditions: [
                        {
                            field: 'size',
                            match: 'greater than',
                            value: '500KB'
                        }
                    ],
                    name: 'A Size Greater Than Rule',
                    stop: null
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(process.stdout.write).to.have.been.calledWith('afrl "A Size Greater Than Rule" active all size over "500K"  discard  \n');
        });
    });

    context('when invalid or superfluous rules are returned', () => {
        it('skips the Ingo Whitelist rule', () => {
            returnedRules = [
                {
                    action: '9',
                    name: 'Whitelist'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(console.warn).to.have.been.calledWith('# Skipping Ingo default rule "Whitelist"');
        });

        it('skips the Ingo Vacation rule', () => {
            returnedRules = [
                {
                    action: '8',
                    disable: true,
                    name: 'Vacation'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(console.warn).to.have.been.calledWith('# Skipping Ingo default rule "Vacation"');
        });

        it('skips the Ingo Blacklist rule', () => {
            returnedRules = [
                {
                    action: '7',
                    name: 'Blacklist'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(console.warn).to.have.been.calledWith('# Skipping Ingo default rule "Blacklist"');
        });

        it('skips the Ingo Forward rule', () => {
            returnedRules = [
                {
                    action: '10',
                    name: 'Forward'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(console.warn).to.have.been.calledWith('# Skipping Ingo default rule "Forward"');
        });

        it('skips the redundant spam rule', () => {
            returnedRules = [
                {
                    action: '2',
                    'action-value': 'INBOX.spam',
                    combine: '1',
                    conditions: [
                        {
                            field: 'X-Spam-Flag',
                            match: 'contains',
                            value: 'YES'
                        }
                    ],
                    name: 'spam'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(console.warn).to.have.been.calledWith('# Skipping redundant spam rule "spam"');
        });

        it('skips the redundant SMS notification rule', () => {
            returnedRules = [
                {
                    action: '14',
                    'action-value': '',
                    combine: '1',
                    conditions: [
                        {
                            field: 'X-Spam-Flag',
                            match: 'not exists',
                            value: ''
                        }
                    ],
                    name: 'sms-notify'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(console.warn).to.have.been.calledWith('# Skipping SMS notification rule "sms-notify"');
        });

        it('skips rules with no conditions', () => {
            returnedRules = [
                {
                    action: '3',
                    'action-value': '',
                    combine: '1',
                    conditions: [
                    ],
                    name: 'Some Rule'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(console.warn).to.have.been.calledWith('# Skipping rule "Some Rule" because it has no valid conditions');
        });

        it('skips rules with action 2 which have no action value', () => {
            returnedRules = [
                {
                    action: '2',
                    'action-value': '',
                    combine: '1',
                    conditions: [
                        {
                            field: 'subject',
                            match: 'contains',
                            value: 'Something'
                        }
                    ],
                    name: 'Some Copy To Path Rule'
                }
            ];
            phpSerializer.unserialize = () => {
                return returnedRules;
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(console.warn).to.have.been.calledWith('# Skipping rule "Some Copy To Path Rule" because it requires an action value but provided none');
        });
    });

    context('when no rules are returned', () => {
        it('logs the problem and skips the mailbox entirely', () => {
            phpSerializer.unserialize = () => {
                return [];
            };
            converter.initialiseApplication();
            // noinspection JSUnresolvedVariable
            expect(console.warn).to.have.been.calledWith('# No rules found for foo@bar.com');
        });
    });

    const prepareStubs = () => {
        returnedRules = [
            {
                action: '2',
                'action-value': 'SomeFolder',
                combine: '2',
                conditions: [
                    {
                        field: 'Subject',
                        match: 'contains',
                        value: 'something'
                    },
                    {
                        field: 'From',
                        match: 'is',
                        value: 'foo@bar.com'
                    }
                ],
                name: 'Some Rule',
                stop: '1'
            }
        ];

        sandbox = sinon.sandbox.create();
        realExit = process.exit;
        process.exit = sandbox.spy();
        process.stdout.write = sandbox.spy();
        console.warn = sandbox.spy();
        commandLineInterface = {
            version: sandbox.stub().returnsThis(),
            description: sandbox.stub().returnsThis(),
            arguments: sandbox.stub().returnsThis(),
            option: sandbox.stub().returnsThis(),
            action: sandbox.stub().callsFake((action) => {
                actionFunction = action;

                return this;
            }),
            parse: sandbox.stub().callsFake(() => {
                actionFunction('foo@bar.com');

                return this;
            }),
            databaseHost: 'localhost',
            databasePost: 3306,
            database: 'something',
            databaseUser: 'somebody',
            databasePassword: 'somePassword',
            help: sandbox.stub(),
            debug: true
        };
        databaseInstance = {
            exec: sandbox.stub().returnsPromise().resolves([{rules: '{s:5:"Rules"}'}])
        };
        mySqlClient = {
            getInstance: sandbox.stub().returns(databaseInstance)
        };
        phpSerializer = {
            unserialize: () => {
                return returnedRules;
            }
        };
        converter = new IngoToZimbraConverter(commandLineInterface, mySqlClient, phpSerializer);
    };

    before(prepareStubs);

    after(() => {
        sandbox.reset();
        process.stdout.write = realStdoutWrite;
        console.warn = realConsoleWarn;
        process.exit = realExit;
    });

    let realStdoutWrite = process.stdout.write;
    let realConsoleWarn = console.warn;
    let realExit;
    let returnedRules;
    let sandbox;
    let commandLineInterface;
    let mySqlClient;
    let databaseInstance;
    let phpSerializer;
    let converter;
    let actionFunction;
});