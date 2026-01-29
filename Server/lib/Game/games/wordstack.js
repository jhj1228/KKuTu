/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var Const = require('../../const');
var Lizard = require('../../sub/lizard');
var DB;
var DIC;

const LANG_STATS = {
    'ko': {
        reg: /^[가-힣]{2,10}$/,
        add: ['type', Const.KOR_GROUP],
        initCharCount: 5
    }, 'en': {
        reg: /^[a-z]{3,10}$/,
        initCharCount: 5
    }
};

const ROBOT_CATCH_RATE = [0.05, 0.2, 0.4, 0.6, 0.99];
const ROBOT_TYPE_COEF = [2000, 1200, 800, 300, 0];

exports.init = function (_DB, _DIC) {
    DB = _DB;
    DIC = _DIC;
};

exports.getTitle = function () {
    var R = new Lizard.Tail();
    var my = this;

    setTimeout(function () {
        R.go("①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳");
    }, 500);
    return R;
};

exports.roundReady = function () {
    var my = this;
    var conf = LANG_STATS[my.rule.lang];
    var charCount = conf.initCharCount;
    var selectedChars = [];
    var i;

    clearTimeout(my.game.turnTimer);
    my.game.round++;
    my.game.roundTime = my.time * 1000;

    if (my.game.round <= my.round) {
        DB.kkutu[my.rule.lang].find(
            ['_id', conf.reg],
            ['hit', { $gte: 1 }],
            conf.add
        ).limit(charCount * 200).on(function ($docs) {
            while (selectedChars.length < charCount && $docs.length > 0) {
                var randomWord = $docs[Math.floor(Math.random() * $docs.length)];
                var randomChar = randomWord._id.charAt(Math.floor(Math.random() * randomWord._id.length));
                if (!selectedChars.includes(randomChar)) {
                    selectedChars.push(randomChar);
                }
            }

            my.game.words = [];

            var players = [];

            for (var i = 0; i < my.players.length; i++) {
                var playerId = my.players[i];
                var player = DIC[playerId];

                if (!player) {
                    continue;
                }

                players.push(player);

                if (!player.game) {
                    player.game = {};
                }
                player.game.ownChars = selectedChars.slice();
                player.game.usedWords = [];
            }

            my.game.pairs = [];

            if (players.length % 2 === 0) {
                for (var j = 0; j < players.length; j += 2) {
                    if (j + 1 < players.length) {
                        my.game.pairs.push({
                            player1: players[j],
                            player2: players[j + 1]
                        });
                        players[j].game.opponent = players[j + 1].id;
                        players[j + 1].game.opponent = players[j].id;
                    }
                }
            } else {
                for (var i = 0; i < players.length; i++) {
                    var nextIdx = (i + 1) % players.length;
                    players[i].game.opponent = players[nextIdx].id;
                    if (i < players.length / 2) {
                        my.game.pairs.push({
                            player1: players[i],
                            player2: players[nextIdx]
                        });
                    }
                }
            }

            var pairsToSend = [];
            for (var p = 0; p < my.game.pairs.length; p++) {
                pairsToSend.push({
                    player1: my.game.pairs[p].player1.id,
                    player2: my.game.pairs[p].player2.id
                });
            }

            my.byMaster('roundReady', {
                round: my.game.round,
                chars: selectedChars,
                pairs: pairsToSend
            }, true);
            my.game.turnTimer = setTimeout(my.turnStart, 2400);
        });
    } else {
        my.roundEnd();
    }
};

exports.turnStart = function () {
    var my = this;

    my.game.late = false;
    my.game.roundAt = (new Date()).getTime();
    my.game.qTimer = setTimeout(my.turnEnd, my.game.roundTime);
    my.byMaster('turnStart', {
        roundTime: my.game.roundTime
    }, true);
};

exports.turnEnd = function () {
    var my = this;

    clearTimeout(my.game.qTimer);

    if (my.game.round < my.round) {
        my.game.roundTimer = setTimeout(function () {
            my.roundReady();
        }, 3000);
    } else {
        my.roundEnd();
    }
};

exports.submit = function (client, text) {
    var my = this;
    var score = 0;
    var conf = LANG_STATS[my.rule.lang];
    var firstChar = text.charAt(0);

    if (!text || !text.match(conf.reg)) {
        return client.chat(text);
    }

    if (!client.game.usedWords) {
        client.game.usedWords = [];
    }
    if (client.game.usedWords.indexOf(text) != -1) {
        return client.publish('turnError', { code: 409, value: text }, true);
    }

    if (!client.game.ownChars || !client.game.ownChars.includes(firstChar)) {
        return client.chat(text);
    }

    var l = my.rule.lang;

    var dbQuery = [['_id', text]];

    if (!my.opts.injeong) {
        dbQuery.push(['flag', { '$nand': Const.KOR_FLAG.INJEONG }]);
    }

    if (my.rule.lang == "ko") {
        dbQuery.push(['type', Const.KOR_GROUP]);
    } else {
        dbQuery.push(['_id', Const.ENG_ID]);
    }

    DB.kkutu[l].findOne.apply(DB.kkutu[l], dbQuery).limit(['_id', true]).on(function ($doc) {
        if (!client.game.ownChars) return;

        if ($doc) {
            score = my.getScore(text);
            client.game.usedWords.push(text);

            var wordChars = text.split('');
            var randomChar = wordChars[Math.floor(Math.random() * wordChars.length)];

            if (my.opts.manner) {
                var mannerQuery = [
                    ['_id', new RegExp('^' + randomChar)],
                    ['hit', { $gte: 1 }]
                ];

                if (!my.opts.injeong) {
                    mannerQuery.push(['flag', { '$nand': Const.KOR_FLAG.INJEONG }]);
                }

                if (my.rule.lang == "ko") {
                    mannerQuery.push(['type', Const.KOR_GROUP]);
                } else {
                    mannerQuery.push(['_id', Const.ENG_ID]);
                }

                DB.kkutu[my.rule.lang].find.apply(DB.kkutu[my.rule.lang], mannerQuery).limit(1).on(function ($charWords) {
                    if (!$charWords || $charWords.length === 0) {
                        return client.publish('turnError', { code: 403, value: text }, true);
                    }

                    proceedTurn();
                });
                return;
            }

            proceedTurn();

            function proceedTurn() {
                var charIndex = client.game.ownChars.indexOf(firstChar);
                if (charIndex > -1) {
                    client.game.ownChars.splice(charIndex, 1);
                }

                var opponent = client.game.opponent ? DIC[client.game.opponent] : null;
                if (opponent && opponent.game.ownChars) {
                    opponent.game.ownChars.push(randomChar);
                }

                client.score += score;
                my.byMaster('turnEnd', {
                    target: client.id,
                    text: text,
                    status: 1,
                    score: score,
                    mean: $doc.mean,
                    theme: $doc.theme,
                    wc: $doc.type ? $doc.type.join(',') : '',
                    removedChar: firstChar,
                    addedChar: randomChar,
                    opponentId: client.game.opponent,
                    playerChars: client.game.ownChars.slice(),
                    opponentChars: opponent ? opponent.game.ownChars.slice() : undefined
                }, true);
            }
        } else {
            return client.chat(text);
        }
    });
};

exports.turnData = function (client, text) {
    var my = this;
    var score = 0;
    var conf = LANG_STATS[my.rule.lang];
    var firstChar = text.charAt(0);

    if (!text || !text.match(conf.reg)) {
        return client.chat(text);
    }

    if (!client.game.usedWords) {
        client.game.usedWords = [];
    }
    if (client.game.usedWords.indexOf(text) != -1) {
        return client.chat(text);
    }

    if (!client.game.ownChars || !client.game.ownChars.includes(firstChar)) {
        return client.chat(text);
    }

    var dbQuery = [['_id', text]];

    if (!my.opts.injeong) {
        dbQuery.push(['flag', { '$nand': Const.KOR_FLAG.INJEONG }]);
    }

    if (my.rule.lang == "ko") {
        dbQuery.push(['type', Const.KOR_GROUP]);
    } else {
        dbQuery.push(['_id', Const.ENG_ID]);
    }

    DB.kkutu[my.rule.lang].findOne.apply(DB.kkutu[my.rule.lang], dbQuery).limit(['_id', true]).on(function ($doc) {
        if (!client.game.ownChars) return;

        if ($doc) {
            score = my.getScore(text);
            client.game.usedWords.push(text);

            var wordChars = text.split('');
            var randomChar = wordChars[Math.floor(Math.random() * wordChars.length)];

            var charIndex = client.game.ownChars.indexOf(firstChar);
            if (charIndex > -1) {
                client.game.ownChars.splice(charIndex, 1);
            }

            var opponent = client.game.opponent ? DIC[client.game.opponent] : null;
            if (opponent && opponent.game.ownChars) {
                opponent.game.ownChars.push(randomChar);
            }

            client.score += score;
            my.byMaster('turnEnd', {
                target: client.id,
                text: text,
                status: 1,
                score: score,
                mean: $doc.mean,
                theme: $doc.theme,
                wc: $doc.type ? $doc.type.join(',') : '',
                removedChar: firstChar,
                addedChar: randomChar,
                opponentId: client.game.opponent,
                playerChars: client.game.ownChars,
                opponentChars: opponent ? opponent.game.ownChars : undefined
            }, true);
        } else {
            return client.chat(text);
        }
    });
};

exports.onChat = function (client, text) {
    var my = this;
    var len = text.length;
    var reg = /^(https?:)?\/\//;

    if (reg.test(text)) return;

    if (client.isGuest) {
        text = "[" + client.profile.nickname + "] " + text;
    }
    my.byMaster('chat', {
        id: client.id,
        text: text
    }, true);
};

exports.getScore = function (text) {
    var score = (text.length - 1) * 5 + 10;
    return Math.round(score);
};
