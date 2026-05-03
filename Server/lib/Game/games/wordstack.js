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

const ROBOT_START_DELAY = [1200, 800, 400, 200, 50, 0];
const ROBOT_TYPE_COEF = [1250, 750, 500, 250, 100, 0];
const ROBOT_THINK_COEF = [4, 2, 1, 0, 0, 0];
const ROBOT_HIT_LIMIT = [8, 4, 2, 1, 0, 0];
const ROBOT_LENGTH_LIMIT = [3, 4, 9, 15, 20, 99];

function getMission(lang) {
    if (lang == 'ko') {
        return Const.MISSION_ko[Math.floor(Math.random() * Const.MISSION_ko.length)];
    } else {
        return Const.MISSION_en[Math.floor(Math.random() * Const.MISSION_en.length)];
    }
}

function getAuto(theme) {
    var my = this;
    var R = new Lizard.Tail();
    var aqs = [['_id', new RegExp(theme)]];

    if (my.game.chain) aqs.push(['_id', { '$nin': my.game.chain }]);

    var raiser = DB.kkutu[my.rule.lang].find.apply(DB.kkutu[my.rule.lang], aqs);
    raiser.on(function ($md) {
        R.go($md);
    });
    return R;
}

function getRandom(arr) {
    if (!arr || !arr.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
}

function getSubChar(char) {
    var code;
    if (!char) return '';
    code = char.charCodeAt(0);
    if (code < 44032) return '';
    return String.fromCharCode(Math.floor((code - 44032) / 28) + 4449);
}

function getChar(text) {
    if (!text || !text.length) return '';
    return text.charAt(text.length - 1);
}

function getSubpool(pool) {
    var my = this;
    return pool.map(function (char) {
        return getSubChar(char);
    });
}

function getWordList(char, subChar, isLimited) {
    var my = this;
    var R = new Lizard.Tail();
    var aqs = [];

    if (isLimited) {
        aqs.push(['_id', new RegExp('^' + char)]);
    } else {
        aqs.push(['_id', new RegExp(char)]);
    }

    if (my.rule.lang == 'ko' && !my.opts.moreword) {
        aqs.push(['type', Const.KOR_GROUP]);
    }

    DB.kkutu[my.rule.lang].find.apply(DB.kkutu[my.rule.lang], aqs).sort(['hit', -1]).limit(50).on(function ($res) {
        R.go($res);
    });

    return R;
}

exports.init = function (_DB, _DIC) {
    DB = _DB;
    DIC = _DIC;
};

exports.getTitle = function () {
    var R = new Lizard.Tail();
    var my = this;
    var l = my.rule;

    if (!l) {
        R.go("①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳");
        return R;
    }

    DB.kkutu[my.rule.lang].find(['_id', /^.{3}$/]).limit(416).on(function ($res) {
        pick($res.map(function (item) { return item._id; }));
    });

    function pick(list) {
        my.game.charpool = [];
        if (my.game.seq) {
            var len = my.game.seq.length * 3;
            for (var j = 0; j < len; j++) {
                my.game.charpool = my.game.charpool.concat(getRandom(list).split(""));
            }
        }
        R.go("①②③④⑤⑥⑦⑧⑨⑩");
    }

    return R;
};

exports.roundInfo = function (client) {
    var my = this;
    client.send('roundReady', {
        round: my.game.round,
        pool: my.game.pool[client.id],
        enter: true
    }, true);
};

exports.roundReady = function () {
    var my = this;

    my.game.round++;
    my.game.roundTime = my.time * 1000;
    if (my.game.round <= my.round) {
        my.game.chain = {};
        my.game.pool = {};
        my.game.dic = {};
        my.game.opponent = {};

        if (my.opts.mission) my.game.mission = getMission(my.rule.lang);

        for (var k in my.game.seq) {
            var o = my.game.seq[k];
            var t = o.robot ? o.id : o;
            my.game.chain[t] = [];
            my.game.pool[t] = [];
            for (var i = 0; i < 5; i++) {
                my.game.pool[t].push(getRandom(my.game.charpool));
            }
        }

        var playerList = [];
        for (var k in my.game.seq) {
            var o = my.game.seq[k];
            var clientId = o.robot ? o.id : o;
            playerList.push(clientId);
        }

        for (var i = playerList.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = playerList[i];
            playerList[i] = playerList[j];
            playerList[j] = temp;
        }

        for (var i = 0; i < playerList.length - 1; i += 2) {
            my.game.opponent[playerList[i]] = playerList[i + 1];
            my.game.opponent[playerList[i + 1]] = playerList[i];
        }

        for (var k in my.game.seq) {
            var o = my.game.seq[k];
            var clientId = o.robot ? o.id : o;
            var client = DIC[clientId];
            if (client) {
                client.send('roundReady', {
                    round: my.game.round,
                    pool: my.game.pool[clientId],
                    mission: my.game.mission,
                    opponent: my.game.opponent[clientId]
                }, true);
            }
        }

        setTimeout(function () {
            my.turnStart();
        }, 2400);
    } else {
        my.roundEnd();
    }
};

exports.turnStart = function () {
    var my = this;

    my.game.late = false;
    my.game.qTimer = setTimeout(function () {
        my.turnEnd();
    }, my.game.roundTime);

    my.byMaster('turnStart', {
        roundTime: my.game.roundTime
    }, true);

    for (var k in my.game.seq) {
        var o = my.game.seq[k];
        var clientId = o.robot ? o.id : o;
        var client = DIC[clientId];
        if (client) {
            client.send('turnStart', {
                pool: my.game.pool[clientId],
                roundTime: my.game.roundTime
            }, true);
        }
    }

    for (var i in my.game.seq) {
        var robot = my.game.seq[i];
        if (robot.robot) {
            my.readyRobot(robot);
        }
    }
};

exports.turnEnd = function () {
    var my = this;

    if (!my.game.seq) return;

    my.game.late = true;
    my.byMaster('turnEnd', {
        ok: false
    }, true);

    my.game._rrt = setTimeout(function () {
        my.roundReady();
    }, (my.game.round == my.round) ? 3000 : 10000);

    clearTimeout(my.game.robotTimer);
};

exports.submit = function (client, text) {
    var my = this;
    var score, l;
    var tv = (new Date()).getTime();

    if (!client || !client.id) return;
    if (!my.game.pool || !my.game.pool.hasOwnProperty(client.id)) return client.chat(text);

    l = my.rule && my.rule.lang ? my.rule.lang : 'ko';

    function isChainable(text, pool) {
        if (!text || text.length <= 1) return false;
        var char = [];
        for (var i in pool) {
            char.push(pool[i]);
            var sub = getSubChar(pool[i]);
            if (sub) char.push(sub);
        }
        return char.indexOf(text[0]) != -1;
    }

    function getPoolIndex(char, clientId) {
        if (!char) return -1;
        var pool = my.game.pool[clientId];
        for (var i in pool) {
            if (pool[i] == char) return i;
            var sub = getSubChar(pool[i]);
            if (sub == char) return i;
        }
        return -1;
    }

    if (!isChainable(text, my.game.pool[client.id])) return client.chat(text);
    if (my.game.chain[client.id].indexOf(text) != -1) return client.send('turnError', { code: 409, value: text }, true);

    function onDB($doc) {
        if (!my.game.chain[client.id]) return;

        var preChar = getChar(text);
        var preSubChar = getSubChar(preChar);

        function approved() {
            if (my.game.late) return;
            if (!my.game.chain[client.id]) return;
            if (!my.game.dic) return;

            score = my.getScore.call(my, text, client.id);
            my.game.dic[text] = (my.game.dic[text] || 0) + 1;
            my.game.chain[client.id].push(text);

            var firstChar = text.charAt(0);
            var endChar = preChar; // 끝말
            var myPool = my.game.pool[client.id];
            var pidx = getPoolIndex(firstChar, client.id);
            if (pidx == -1) return;
            myPool.splice(pidx, 1);

            var opponentId = my.game.opponent[client.id];
            if (opponentId && my.game.pool[opponentId]) {
                my.game.pool[opponentId].push(endChar);
            }

            client.game.score += score;

            for (var k in my.game.seq) {
                var o = my.game.seq[k];
                var otherId = o.robot ? o.id : o;
                var otherClient = DIC[otherId];
                if (otherClient) {
                    var isMe = (otherId === client.id);
                    otherClient.publish('turnEnd', {
                        ok: true,
                        target: client.id,
                        value: text,
                        mean: $doc ? $doc.mean : '',
                        theme: $doc ? $doc.theme : '',
                        wc: $doc ? $doc.type : '',
                        score: isMe ? score : 0,
                        bonus: 0,
                        pool: my.game.pool[otherId],
                        subpool: getSubpool.call(my, my.game.pool[otherId])
                    }, true);
                }
            }

            if (!client.robot) {
                client.invokeWordPiece(text, 1);
                if ($doc) {
                    DB.kkutu[l].update(['_id', text]).set(['hit', $doc.hit + 1]).on();
                }
            }
        }

        function denied(code) {
            client.send('turnError', { code: code || 404, value: text });
        }

        if ($doc) {
            if (!my.opts.injeong && ($doc.flag & Const.KOR_FLAG.INJEONG)) denied();
            else if (my.opts.strict && (!$doc.type.match(Const.KOR_STRICT) || $doc.flag >= 4)) denied(406);
            else if (my.opts.loanword && ($doc.flag & Const.KOR_FLAG.LOANWORD)) denied(405);
            else approved();
        } else {
            denied(404);
        }
    }

    var queryArgs = [['_id', text]];
    if (l == "ko") {
        if (!my.opts.moreword) queryArgs.push(['type', Const.KOR_GROUP]);
    } else {
        queryArgs.push(['_id', Const.ENG_ID]);
    }

    DB.kkutu[l].findOne.apply(DB.kkutu[l], queryArgs).on(onDB);
};

exports.getScore = function (text, clientId) {
    var my = this;
    var score;

    if (!text || !my.game.chain || !my.game.dic) return 0;

    score = Const.getPreScore(text, my.game.chain[clientId], 1);
    if (my.game.dic[text]) score *= 15 / (my.game.dic[text] + 15);

    return Math.round(score);
};

exports.readyRobot = function (robot) {
    var my = this;
    var level = robot.level;
    var delay = ROBOT_START_DELAY[level] + 1000;

    if (my.game.late) return;
    if (!my.game.pool || !my.game.pool[robot.id]) return;

    var pool = my.game.pool[robot.id];
    if (!pool.length) {
        setTimeout(function () {
            my.readyRobot(robot);
        }, delay);
        return;
    }

    var targetChar = getRandom(pool);
    var subChar = getSubChar(targetChar);
    var text, i;

    getWordList.call(my, targetChar, subChar, true).then(function (list) {
        if (!list || !list.length) {
            text = targetChar + '... T.T';
            doRobotMove();
            return;
        }

        var chain = my.game.chain[robot.id];
        var target = null;

        for (i = 0; i < list.length; i++) {
            var word = list[i];
            if (word._id.length > ROBOT_LENGTH_LIMIT[level]) continue;
            if (word.hit < ROBOT_HIT_LIMIT[level]) continue;
            if (chain.indexOf(word._id) !== -1) continue;

            if (!target || Math.random() > 0.5) {
                target = word;
            }
        }

        if (target) {
            text = target._id;
            delay += 500 * ROBOT_THINK_COEF[level] * Math.random() / Math.log(1.1 + target.hit);
        } else {
            text = targetChar + '... T.T';
        }
        doRobotMove();
    });

    function doRobotMove() {
        delay += text.length * ROBOT_TYPE_COEF[level];

        if (!my.game.chain[robot.id]) return;
        my.game.chain[robot.id].push(text);

        var pool = my.game.pool[robot.id];
        var char = text.charAt(0);
        var pidx = -1;
        for (var i in pool) {
            if (pool[i] == char) {
                pidx = i;
                break;
            }
            var sub = getSubChar(pool[i]);
            if (sub == char) {
                pidx = i;
                break;
            }
        }
        if (pidx !== -1) pool.splice(pidx, 1);

        var endChar = getChar(text);
        var opponentId = my.game.opponent[robot.id];
        if (opponentId && my.game.pool[opponentId]) {
            my.game.pool[opponentId].push(endChar);
        }

        my.game.dic[text] = (my.game.dic[text] || 0) + 1;

        for (var k in my.game.seq) {
            var o = my.game.seq[k];
            var otherId = o.robot ? o.id : o;
            var otherClient = DIC[otherId];
            if (otherClient) {
                otherClient.publish('turnEnd', {
                    ok: true,
                    target: robot.id,
                    value: text,
                    mean: '',
                    theme: '',
                    wc: '',
                    score: 0,
                    bonus: 0,
                    pool: my.game.pool[otherId],
                    subpool: getSubpool.call(my, my.game.pool[otherId])
                }, true);
            }
        }

        setTimeout(function () {
            my.readyRobot(robot);
        }, delay);
    }
};