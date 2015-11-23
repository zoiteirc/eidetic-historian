var config = {
    server_url: 'irc.zoite.net',
    nick: 'eidetic',
    channels: [
        '#zoite'
    ],
    database_file: 'seen_database.db'
};

function series(callbacks, last) {
    var results = [];
    function next() {
        var callback = callbacks.shift();
        if(callback) {
            callback(function() {
                results.push(Array.prototype.slice.call(arguments));
                next();
            });
        } else {
            last(results);
        }
    }
    next();
}

var database = {
    _records: {},
    add_record: function (nick, data) {
        this._records[nick.toLowerCase()] = {nick: nick, data: data};
    },
    print_records: function () {
        Object.keys(this._records).forEach(function(idx) {
            console.log(database._records[idx].nick + ' => ' + database._records[idx].data);
        });
    },
    read: function (callback) {
        var rl = require('readline').createInterface({
            input: require('fs').createReadStream(config.database_file),
            terminal: false
        });

        rl.on('line', function (line) {
            if (line.substr(0,1) == '#') {
                // comment.
            } else if (line.trim() == '') {
                // empty line
            } else {
                var record = line.split(' ');
                if (record.length < 5) {
                    // Not enough
                } else {
                    var expected_length;
                    switch (record[3]) {
                        case 'nick':
                        case 'rnck':
                        case 'part':
                        case 'quit':
                            expected_length = 6;
                            break;
                        case 'join':
                            expected_length = 5;
                            break;
                        case 'kick':
                            expected_length = 7;
                            break;
                        default:
                            throw new Error('Unexpected record type ' + record[3]);
                    }
                    if (record.length != expected_length) {
                        var e = new Error('Unexpected length of ' + record.length + ' for ' + record[3]);
                        e.record = record;
                    }
                    database.add_record(record.shift(), record.join(' '));
                }
            }
        }).on('close', function () {
            callback();
        });
    }
};

var connect_to_irc = function () {
    /** connect to irc */
    console.log('Connecting to IRC...');

    var irc = require('irc');
    var client = new irc.Client(config.server_url, config.nick, {
        channels: config.channels
    });

    client.addListener('nick', function (old_nick, new_nick, channels, message) {

        var timestamp = Math.floor(new Date() / 1000);

        for (var i = 0, j = channels.length; i < j; i++) {
            database.add_record(old_nick, [
                message.host,        // uhost
                timestamp - 1,  // timestamp
                'nick',         // type
                channels[i],    // channel
                new_nick        // nick
            ].join(' '));
            database.add_record(new_nick, [
                message.host,        // uhost
                timestamp,      // timestamp
                'rnck',         // type
                channels[i],    // channel
                old_nick        // nick
            ].join(' '));
        }
    });
    client.addListener('join', function (channel, nick, message) {
        var timestamp = (Math.floor(new Date() / 1000));

        database.add_record(nick, [
            message.host,    // uhost
            timestamp,  // timestamp
            'join',     // type
            channel     // channel
        ].join(' '));
    });
    client.addListener('part', function (channel, nick, reason, message) {
        var timestamp = (Math.floor(new Date() / 1000));

        database.add_record(nick, [
            message.host,    // uhost
            timestamp,  // timestamp
            'part',     // type
            channel,    // channel
            reason      // reason
        ].join(' '));
    });
    client.addListener('kick', function (channel, nick, kicked_by, reason) {
        var timestamp = (Math.floor(new Date() / 1000));

        database.add_record(nick, [
            'dunno',    // uhost
            timestamp,  // timestamp
            'kick',     // type
            channel,    // channel
            kicked_by,  // kicked_by
            reason      // reason
        ].join(' '));
    });
    client.addListener('quit', function (nick, reason, channels, message) {
        var timestamp = Math.floor(new Date() / 1000);

        for (var i = 0, j = channels.length; i < j; i++) {
            database.add_record(nick, [
                message.host,        // uhost
                timestamp,      // timestamp
                'quit',         // type
                channels[i],    // channel
                reason          // reason
            ].join(' '));
        }
    });

    client.addListener('message#', function (from, to, text, message) {
        console.log(to + ': <' + from + '> ' + text);
        var response = '';
        if (text.substr(0, 6) == '!seen ') {
            response = Seen.seen(from, text);
        } else if (text.substr(0, 11) == '!lastspoke ') {
            response = Seen.lastspoke(from, text);
        }

        if (response != '') {
            console.log(to + ': <' + config.nick + '> ' + response);
            this.say(to, response);
        }
    });
};

var Seen = {
    seen: function(from, cmd) {
        // TODO: Flood protection

        cmd = cmd
            // Get rid of the !seen
            .substr(6)

            // Get the first word
            .split(/\s/).shift()

            // Get rid of trailing punctuation
            .replace(/[,.?!:]+$/, '')
        ;

        if (from.toLowerCase() == cmd.toLowerCase()) {
            return from + ', go get a fucking mirror.';
        }

        if (cmd.toLowerCase() == config.nick.toLowerCase()) {
            return from + ', I\'m right here. Quit wasting my time you little shit...';
        }

        // TODO: On channel.

        var result = this.search('chan?', from, cmd, 0);
        if (result === 0) {
            return from + ', I don\'t remember seeing ' + cmd + '.';
        } else {
            return result;
        }
    },
    lastspoke: function(from, cmd) {
        return '!lastspoke response.'
    },
    floodProtect: function (nick, uhost) {
        // TODO: Return true if they're flooding
        return false;
    },

    maskhost: function (address) {
        address.split('@');
        var user = address[0];
        var host = address[1];

        // 1.2.3.4 -> 1.2.3.*
        if (host.match(/^[12]?[0-9]?[0-9]\.[12]?[0-9]?[0-9]\.[12]?[0-9]?[0-9]\.[12]?[0-9]?[0-9]\$/)) {
            host = host.split('.').slice(0, 3).join('.') + '.*';
        } else
        // sub.domain.com -> *.domain.com domain.com -> domain.com
        if (host.split('.').length > 2) {
            host = '*.' + host.split('.').slice(1);
        }

        user = user.split('!')[0];

        return '*!' + user + '@' + host;
    },

    search_mask: function (mask) {
        // TODO: Implement
    },

    search: function (channel, nick, data, no) {
        data = data.toLowerCase();

        if (data == '') {
            return '';
        }

        // TODO: Limit on nick length?

        if (no == 0) {
            if (database._records.hasOwnProperty(nick.toLowerCase())) {
                var address = data._records[nick.toLowerCase()][0];
                var results = this.search_mask(this.maskhost(address));

            }

        }

        return this.explain_nick_record(channel, data);
    },

    explain_nick_record: function (channel, nick) {
        if (!database._records.hasOwnProperty(nick.toLowerCase())) {
            return 0;
        } else {
            var record = database._records[nick.toLowerCase()];
            nick = record.nick;
            var data = record.data.split(' ');
            var address = data[0];
            var timestamp = data[1];
            channel = data[3];

            var reason;

            switch (data[2]) {
                case 'part':
                    reason = data.slice(4).join(' ');
                    if (reason != '') {
                        reason = ' stating "' + reason + '"';
                    }
                    return nick + ' (' + address + ') was last seen parting ' + channel + ' ' + this.when(timestamp) + ' ago' + reason + '.';
                    break;
                case 'quit':
                    reason = data.slice(4).join(' ');
                    if (reason != '') {
                        reason = ' stating (' + reason + ')';
                    }
                    return nick + ' (' + address + ') was last seen quitting from ' + channel + ' ' + this.when(timestamp) + ' ago' + reason + '.';
                    break;
                case 'kick':
                    return nick + ' (' + address + ') was last seen being kicked from ' + channel + ' by ' + data[4] + ' ' + this.when(timestamp) + ' ago with the reason (' + data.slice(5).join(' ') + ').';
                    break;
                case 'rnck':
                    // TODO: Current channel lists.
                    return nick + ' (' + address + ') was last seen changing nicks from ' + data[4] + ' on ' + channel + ' ' + this.when(timestamp) + ' ago.';
                    break;
                case 'nick':
                    return nick + ' ('+ address + ') was last seen changing nicks to ' + data[4] + ' on ' + channel + ' ' + this.when(timestamp) + ' ago.';
                    break;
                case 'splt':
                    return nick + ' ('+ address + ') was last seen parting ' + channel + ' due to a split ' + this.when(timestamp) + ' ago.';
                    break;
                case 'rejn':
                    return nick + ' ('+ address + ') was last seen rejoining ' + channel + ' from a split ' + this.when(timestamp) + ' ago.';
                    // TODO: Current channel lists.
                    break;
                case 'join':
                    return nick + ' (' + address + ') was last seen joining ' + channel + ' ' + this.when(timestamp) + ' ago.';
                    // TODO: Current channel lists.
                    break;
                default:
                    return 'error';
                    break;
            }
        }
    },

    when: function (timestamp) {
        var years = 0, days = 0, hours = 0, mins = 0;
        var now = Math.floor(new Date() / 1000);

        var interval = now - timestamp;
        var output = [];

        if (interval < 60) { return 'only ' + interval + ' seconds'; }
        if (interval >= 31536000) { years = Math.floor(interval / 31536000); interval = interval - (31536000 * years); }
        if (interval >= 86400) { days = Math.floor(interval / 86400); interval = interval - (86400 * days); }
        if (interval >= 3600) { hours = Math.floor(interval / 3600); interval = interval - (3600 * hours); }
        if (interval >= 60) { mins = Math.floor(interval / 60); }

        if (years > 0) { output.push(years + ' year' + (years == 1 ? '' : 's')); }
        if (days > 0) { output.push(days + ' day' + (days == 1 ? '' : 's')); }
        if (hours > 0) { output.push(hours + ' hour' + (hours == 1 ? '' : 's')); }
        if (mins > 0) { output.push(mins + ' minute' + (mins == 1 ? '' : 's')); }

        return output.join(', ');
    }
};

series(
    [
        function (next) {
            /** load database */
            database.read(next);
        },
        function (next) {
            /** report a summary */
            console.log('Database read finished. Loaded ' + Object.keys(database._records).length + ' records.');
            next();
        }
    ],
    connect_to_irc
);

// TODO: BEFORE 0.1
// TODO: Mask searching
// TODO: !seennick
// TODO: simple responders? !knai, !beer, !wine, etc