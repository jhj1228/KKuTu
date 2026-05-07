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

var RIEUL_TO_NIEUN = [4449, 4450, 4457, 4460, 4462, 4467];
var RIEUL_TO_IEUNG = [4451, 4455, 4456, 4461, 4466, 4469];
var NIEUN_TO_IEUNG = [4455, 4461, 4466, 4469];

function getDueumChar(char) {
    if (!$data.room || $data.room.opts.dueum) return char;

    var code = char.charCodeAt(0);
    if (code < 44032) return char;

    var k = code - 0xAC00;
    if (k < 0 || k > 11171) return char;

    var ca = [Math.floor(k / 28 / 21), Math.floor(k / 28) % 21, k % 28];
    var cb = [ca[0] + 0x1100, ca[1] + 0x1161, ca[2] + 0x11A7];
    var cc = false;

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
        return String.fromCharCode(((cb[0] * 21) + cb[1]) * 28 + cb[2] + 0xAC00);
    }

    return char;
}

function formatPoolDisplay(pool) {
    return pool.map(function (char) {
        var dueumChar = getDueumChar(char);
        if (dueumChar === char) {
            return char;
        } else {
            return char + '(' + dueumChar + ')';
        }
    }).join(' ');
}

function updatePoolBar() {
    var $bar = $(".jjo-turn-time .graph-bar");
    var poolLength = $data._pool ? $data._pool.length : 0;
    var width = Math.min(poolLength / 8 * 100, 100);
    var bgColor = poolLength > 8 ? "#FF4444" : "#E6E846";

    $bar.width(width + "%")
        .html(poolLength + "/8")
        .css({ 'text-align': "right", 'background-color': bgColor });
}

$lib.Wordstack.roundReady = function (data) {
    var i, len = $data.room.game.title.length;
    var $l;

    clearBoard();
    $data._round = data.round;
    $data._roundTime = $data.room.time * 1000;
    $data._fastTime = 10000;
    $data.chain = 0;

    $data._pool = data.pool || [];
    $stage.game.display.html(formatPoolDisplay($data._pool));
    $stage.game.chain.show().html($data.chain);
    updatePoolBar();
    if ($data.room.opts.mission) {
        $stage.game.items.show().css('opacity', 1).html($data.mission = data.mission);
    }
    drawRound(data.round);
    playSound('round_start');
    recordEvent('roundReady', { data: data });
};

$lib.Wordstack.turnStart = function (data) {
    if (!$data._spectate) {
        $stage.game.here.show();
        if (mobile) $stage.game.hereText.val("").focus();
        else $stage.talk.val("").focus();
    }

    if (data.pool && Array.isArray(data.pool)) {
        $data._pool = data.pool;
    }
    var poolDisplay = formatPoolDisplay($data._pool);
    $stage.game.display.html($data._char = poolDisplay || "🔤");
    updatePoolBar();

    ws.onmessage = _onMessage;
    clearInterval($data._tTime);
    clearTrespasses();
    $data._tTime = addInterval($lib.Wordstack.turnGoing, TICK);
    $data._roundTime = data.roundTime;
    playBGM('jaqwi');
    recordEvent('turnStart', {
        data: data
    });
};

$lib.Wordstack.turnGoing = function () {
    var $rtb = $stage.game.roundBar;
    var bRate;
    var tt;

    if (!$data.room) clearInterval($data._tTime);
    $data._roundTime -= TICK;

    tt = $data._spectate ? L['stat_spectate'] : ($data._roundTime * 0.001).toFixed(1) + L['SECOND'];
    $rtb
        .width($data._roundTime / $data.room.time * 0.1 + "%")
        .html(tt);

    if (!$rtb.hasClass("round-extreme")) if ($data._roundTime <= $data._fastTime) {
        bRate = $data.bgm.currentTime / $data.bgm.duration;
        if ($data.bgm.paused) stopBGM();
        else playBGM('jaqwiF');
        $data.bgm.currentTime = $data.bgm.duration * bRate;
        $rtb.addClass("round-extreme");
    }
};

$lib.Wordstack.turnEnd = function (id, data) {
    var $sc = $("<div>")
        .addClass("deltaScore")
        .html((data.score > 0) ? ("+" + (data.score - data.bonus)) : data.score);
    var $uc = $("#game-user-" + id);

    if (data.ok) {
        if ($data.id == id) {
            checkFailCombo();
            clearTimeout($data._fail);
            $data.chain++;
            $stage.game.chain.html($data.chain);
            playSound('mission');
            pushHistory(data.value, data.mean, data.theme, data.wc);

            if (data.pools && data.pools[$data.id]) {
                $data._pool = data.pools[$data.id];
                var poolDisplay = formatPoolDisplay($data._pool);
                $stage.game.display.html(poolDisplay);
                $data._char = poolDisplay;
                updatePoolBar();
            }
        } else {
            pushHistory(data.value, data.mean, data.theme, data.wc);

            if (data.pools && data.pools[$data.id]) {
                $data._pool = data.pools[$data.id];
                var poolDisplay = formatPoolDisplay($data._pool);
                $stage.game.display.html(poolDisplay);
                $data._char = poolDisplay;
                updatePoolBar();
            }
        }

        addScore(id, data.score);
    } else {
        clearInterval($data._tTime);
        $stage.game.here.hide();
        stopBGM();
        playSound('horr');
        addTimeout(restGoing, 1000, 10);
    }

    if (data.bonus) {
        mobile ? $sc.html("+" + (data.score - data.bonus) + "+" + data.bonus) : addTimeout(function () {
            var $bc = $("<div>")
                .addClass("deltaScore bonus")
                .html("+" + data.bonus);

            drawObtainedScore($uc, $bc);
        }, 500);
    }
    drawObtainedScore($uc, $sc);
    updateScore(id, getScore(id));
};

function restGoing(rest) {
    $(".jjo-turn-time .graph-bar")
        .html(rest + L['afterRun']);
    if (rest > 0) addTimeout(restGoing, 1000, rest - 1);
}
