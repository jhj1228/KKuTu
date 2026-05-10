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
const ROBOT_HIT_LIMIT = [9999];
const ROBOT_LENGTH_LIMIT = [3, 4, 9, 15, 20, 99];

const RIEUL_TO_NIEUN = [4449, 4450, 4457, 4460, 4462, 4467];
const RIEUL_TO_IEUNG = [4451, 4455, 4456, 4461, 4466, 4469];
const NIEUN_TO_IEUNG = [4455, 4461, 4466, 4469];

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
    var my = this;
    var code;
    var k, ca, cb, cc;
    var r;

    if (!char) return '';
    code = char.charCodeAt(0);
    if (code < 44032) return '';

    if (my && my.opts && my.opts.dueum) {
        return String.fromCharCode(Math.floor((code - 44032) / 28) + 4449);
    }

    k = code - 0xAC00;
    if (k < 0 || k > 11171) return '';

    ca = [Math.floor(k / 28 / 21), Math.floor(k / 28) % 21, k % 28];
    cb = [ca[0] + 0x1100, ca[1] + 0x1161, ca[2] + 0x11A7];
    cc = false;

    if (cb[0] == 4357) {
        cc = true;
        if (RIEUL_TO_NIEUN.includes(cb[1])) cb[0] = 4354;
        else if (RIEUL_TO_IEUNG.includes(cb[1])) cb[0] = 4363;
        else cc = false;
    } else if (cb[0] == 4354) {
        if (NIEUN_TO_IEUNG.indexOf(cb[1]) != -1) {
            cb[0] = 4363;
            cc = true;
        }
    }

    if (cc) {
        cb[0] -= 0x1100; cb[1] -= 0x1161; cb[2] -= 0x11A7;
        r = String.fromCharCode(((cb[0] * 21) + cb[1]) * 28 + cb[2] + 0xAC00);
        return r;
    }

    return String.fromCharCode(Math.floor((code - 44032) / 28) + 4449);
}

function getChar(text) {
    if (!text || !text.length) return '';
    return text.charAt(text.length - 1);
}

function isKoreanWord(text) {
    if (!text) return false;
    for (var i = 0; i < text.length; i++) {
        var code = text.charCodeAt(i);
        if (code < 0xAC00 || code > 0xD7A3) {
            return false;
        }
    }
    return true;
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
        if (subChar && subChar !== char) {
            aqs.push(['_id', new RegExp('^(' + char + '|' + subChar + ')')]);
        } else {
            aqs.push(['_id', new RegExp('^' + char)]);
        }
    } else {
        if (subChar && subChar !== char) {
            aqs.push(['_id', new RegExp('(' + char + '|' + subChar + ')')]);
        } else {
            aqs.push(['_id', new RegExp(char)]);
        }
    }

    if (my.rule.lang == 'ko' && !my.opts.moreword) {
        aqs.push(['type', Const.KOR_GROUP]);
    }

    DB.kkutu[my.rule.lang].find.apply(DB.kkutu[my.rule.lang], aqs).sort(['hit', -1]).limit(50).on(function ($res) {
        if (my.game && !my.game.late) {
            R.go($res || []);
        } else {
            R.go([]);
        }
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
        R.go("①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳");
    }

    return R;
};

exports.roundInfo = function (client) {
    var my = this;
    if (my.opts.mission && my.game.mission && !my.game.mission[client.id]) {
        my.game.mission[client.id] = getMission(my.rule.lang);
    }
    client.send('roundReady', {
        round: my.game.round,
        pool: my.game.pool[client.id],
        mission: my.game.mission ? my.game.mission[client.id] : null,
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
        my.game.mission = {};

        if (my.opts.mission) {
            for (var k in my.game.seq) {
                var o = my.game.seq[k];
                var t = o.robot ? o.id : o;
                my.game.mission[t] = getMission(my.rule.lang);
            }
        }

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

        if (playerList.length % 2 === 1) {
            for (var i = 0; i < playerList.length; i++) {
                my.game.opponent[playerList[i]] = playerList[(i + 1) % playerList.length];
            }
        } else {
            for (var i = 0; i < playerList.length; i += 2) {
                my.game.opponent[playerList[i]] = playerList[i + 1];
                my.game.opponent[playerList[i + 1]] = playerList[i];
            }
        }

        for (var k in my.game.seq) {
            var o = my.game.seq[k];
            var clientId = o.robot ? o.id : o;
            var client = DIC[clientId];
            if (client) {
                client.send('roundReady', {
                    round: my.game.round,
                    pool: my.game.pool[clientId],
                    mission: my.game.mission[clientId],
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
                roundTime: my.game.roundTime,
                mission: my.game.mission[clientId]
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
        var targetChar = my.opts.apmal ? text[text.length - 1] : text[0];
        for (var i in pool) {
            char.push(pool[i]);
            var sub = getSubChar(pool[i]);
            if (sub) char.push(sub);
        }
        return char.indexOf(targetChar) != -1;
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
    if (l === 'ko' && !isKoreanWord(text)) return client.chat(text);
    if (my.game.chain[client.id].indexOf(text) != -1) return client.send('turnError', { code: 409, value: text }, true);

    function onDB($doc) {
        if (!my.game || my.game.late || !my.game.chain[client.id]) return;

        var preChar = getChar(text);
        var preSubChar = getSubChar(preChar);

        function approved() {
            if (my.game.late) return;
            if (!my.game.chain[client.id]) return;
            if (!my.game.dic) return;

            my.game.chain[client.id].push(text);

            var baseScore = my.getScore.call(my, text, client.id, true);
            score = my.getScore.call(my, text, client.id);
            var bonus = score - baseScore;

            var myPool = my.game.pool[client.id];
            var myRemoveChar, toOpponentChar;

            if (my.opts.apmal) {
                myRemoveChar = text.charAt(text.length - 1);
                toOpponentChar = text.charAt(0);
            } else {
                myRemoveChar = text.charAt(0);
                toOpponentChar = preChar;
            }

            var pidx = getPoolIndex(myRemoveChar, client.id);
            if (pidx == -1) return;
            myPool.splice(pidx, 1);

            var opponentId = my.game.opponent[client.id];
            if (opponentId && my.game.pool[opponentId]) {
                my.game.pool[opponentId].push(toOpponentChar);
            }

            client.game.score += score;

            var poolData = {};
            for (var k in my.game.pool) {
                poolData[k] = my.game.pool[k];
            }

            client.publish('turnEnd', {
                ok: true,
                target: client.id,
                value: text,
                mean: $doc ? $doc.mean : '',
                theme: $doc ? $doc.theme : '',
                wc: $doc ? $doc.type : '',
                score: score,
                bonus: bonus,
                pools: poolData,
                mission: my.game.mission ? my.game.mission[client.id] : null
            }, true);

            if (!client.robot) {
                client.invokeWordPiece(text, 1);
                if ($doc && my.game && my.game.late === false) {
                    DB.kkutu[l].update(['_id', text]).set(['hit', $doc.hit + 1]).on();
                }
            }
        }

        function checkManner() {
            if (!my.opts.manner) {
                approved();
                return;
            }

            var checkChar, checkSubChar;
            if (my.opts.apmal) {
                checkChar = text.charAt(0);
                checkSubChar = getSubChar(checkChar);
            } else {
                checkChar = preChar;
                checkSubChar = preSubChar;
            }

            getWordList.call(my, checkChar, checkSubChar, true).then(function (list) {
                if (!my.game || my.game.late) return;
                if (list && list.length) {
                    approved();
                } else {
                    denied(403);
                }
            });
        }

        function denied(code) {
            client.send('turnError', { code: code || 404, value: text }, true);
        }

        if ($doc) {
            if (!my.opts.injeong && ($doc.flag & Const.KOR_FLAG.INJEONG)) denied();
            else if (my.opts.strict && (!$doc.type.match(Const.KOR_STRICT) || $doc.flag >= 4)) denied(406);
            else if (my.opts.loanword && ($doc.flag & Const.KOR_FLAG.LOANWORD)) denied(405);
            else checkManner();
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

exports.getScore = function (text, clientId, skipMission) {
    var my = this;
    var score, arr;

    if (!text || !my.game.chain || !my.game.dic) return 0;

    score = Const.getPreScore(text, my.game.chain[clientId], 1);
    if (my.game.dic[text]) score *= 15 / (my.game.dic[text] + 15);

    if (!skipMission && my.game.mission && my.game.mission[clientId] && typeof my.game.mission[clientId] === 'string' && my.opts.mission) {
        var escapedMission = my.game.mission[clientId].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (arr = text.match(new RegExp(escapedMission, "g"))) {
            score += score * 0.5 * arr.length;
            my.game.mission[clientId] = getMission(my.rule.lang);
        }
    }

    return Math.round(score);
};

exports.readyRobot = function (robot) {
    var my = this;
    var level = robot.level;
    var delay = ROBOT_START_DELAY[level] + 1000;

    if (!my.game || my.game.late) return;
    if (!my.game.pool || !my.game.pool[robot.id]) return;

    var pool = my.game.pool[robot.id];
    if (!pool.length) {
        if (my.game && !my.game.late) {
            setTimeout(function () {
                if (my.game && !my.game.late) {
                    my.readyRobot(robot);
                }
            }, delay);
        }
        return;
    }

    var targetChar, subChar, text, i;
    var findAttempts = 0;
    var MAX_POOL_ATTEMPTS = pool.length * 3;

    var tryFindValidChar = function () {
        if (findAttempts >= MAX_POOL_ATTEMPTS) {
            if (my.game && !my.game.late) {
                setTimeout(function () {
                    if (my.game && !my.game.late) {
                        my.readyRobot(robot);
                    }
                }, delay);
            }
            return;
        }

        targetChar = getRandom(pool);
        subChar = getSubChar(targetChar);
        findAttempts++;

        getWordList.call(my, targetChar, subChar, true).then(function (list) {
            if (!my.game || !my.game.chain || my.game.late) return;

            if (!list || !list.length) {
                tryFindValidChar();
            } else {
                var chain = my.game.chain[robot.id];
                var validWords = [];

                for (i = 0; i < list.length; i++) {
                    var word = list[i];
                    if (word._id.length < 2) continue;
                    if (word._id.length > ROBOT_LENGTH_LIMIT[level]) continue;
                    if (word.hit < ROBOT_HIT_LIMIT[level]) continue;
                    if (chain.indexOf(word._id) !== -1) continue;

                    if (my.rule.lang === 'ko' && !isKoreanWord(word._id)) continue;

                    validWords.push(word);
                }

                if (!validWords.length) {
                    tryFindValidChar();
                    return;
                }

                var wordAttempts = 0;
                var MAX_WORD_ATTEMPTS = Math.min(5, validWords.length);

                function tryWord() {
                    if (wordAttempts >= MAX_WORD_ATTEMPTS) {
                        tryFindValidChar();
                        return;
                    }

                    var target = validWords[Math.floor(Math.random() * validWords.length)];
                    text = target._id;
                    delay += 500 * ROBOT_THINK_COEF[level] * Math.random() / Math.log(1.1 + target.hit);
                    wordAttempts++;

                    var nextChar, nextSubChar;
                    if (my.opts.apmal) {
                        nextChar = text.charAt(0);
                        nextSubChar = getSubChar(nextChar);
                    } else {
                        nextChar = getChar(text);
                        nextSubChar = getSubChar(nextChar);
                    }

                    getWordList.call(my, nextChar, nextSubChar, true).then(function (nextList) {
                        if (!my.game || !my.game.chain || my.game.late) return;

                        if (!nextList || !nextList.length) {
                            tryWord();
                        } else {
                            doRobotMove();
                        }
                    });
                }

                tryWord();
            }
        });
    };

    function doRobotMove() {
        if (!my.game || my.game.late || !text) return;

        delay += text.length * ROBOT_TYPE_COEF[level];

        if (!my.game.chain[robot.id] || !my.game.pool || !my.game.pool[robot.id]) return;

        my.game.chain[robot.id].push(text);

        var pool = my.game.pool[robot.id];
        var myRemoveChar, toOpponentChar;

        if (my.opts.apmal) {
            myRemoveChar = text.charAt(text.length - 1);
            toOpponentChar = text.charAt(0);
        } else {
            myRemoveChar = text.charAt(0);
            toOpponentChar = getChar(text);
        }

        var pidx = -1;
        for (var i in pool) {
            if (pool[i] == myRemoveChar) {
                pidx = i;
                break;
            }
            var sub = getSubChar(pool[i]);
            if (sub == myRemoveChar) {
                pidx = i;
                break;
            }
        }
        if (pidx !== -1) pool.splice(pidx, 1);

        var opponentId = my.game.opponent[robot.id];
        if (opponentId && my.game.pool[opponentId] && /[가-힣a-zA-Z]/.test(toOpponentChar)) {
            my.game.pool[opponentId].push(toOpponentChar);
        }

        var baseScore = my.getScore.call(my, text, robot.id, true);
        var score = my.getScore.call(my, text, robot.id);
        var bonus = score - baseScore;
        robot.game.score += score;

        my.game.dic[text] = (my.game.dic[text] || 0) + 1;

        var poolData = {};
        for (var k in my.game.pool) {
            poolData[k] = my.game.pool[k];
        }

        var l = my.rule && my.rule.lang ? my.rule.lang : 'ko';
        var queryArgs = [['_id', text]];
        if (l == "ko") {
            queryArgs.push(['type', Const.KOR_GROUP]);
        } else {
            queryArgs.push(['_id', Const.ENG_ID]);
        }

        DB.kkutu[l].findOne.apply(DB.kkutu[l], queryArgs).on(function ($doc) {
            if (!my.game || !my.game.chain || !my.game.pool) return;

            my.byMaster('turnEnd', {
                ok: true,
                target: robot.id,
                value: text,
                mean: $doc ? $doc.mean : '',
                theme: $doc ? $doc.theme : '',
                wc: $doc ? $doc.type : '',
                score: score,
                bonus: bonus,
                pools: poolData,
                mission: my.game.mission ? my.game.mission[robot.id] : null
            }, true);

            if (my.game && !my.game.late) {
                setTimeout(function () {
                    if (my.game && !my.game.late) {
                        my.readyRobot(robot);
                    }
                }, delay);
            }
        });
    }

    tryFindValidChar();
};