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

$lib.Wordstack.roundReady = function (data, spec) {
    clearBoard();
    $data._roundTime = $data.room.time * 1000;
    $data._chars = data.chars;
    $data._pairs = data.pairs || [];
    $data._round = data.round;

    $data._myPair = null;
    $data._opponentId = null;
    for (var i = 0; i < $data._pairs.length; i++) {
        if ($data._pairs[i].player1 === $data.id) {
            $data._myPair = $data._pairs[i];
            $data._opponentId = $data._pairs[i].player2;
            break;
        } else if ($data._pairs[i].player2 === $data.id) {
            $data._myPair = $data._pairs[i];
            $data._opponentId = $data._pairs[i].player1;
            break;
        }
    }

    $stage.game.display.html(getCharDisplayText(data.chars));
    $stage.game.chain.show().html($data.chain = 0);
    $stage.game.items.hide();

    drawRound(data.round);
    if (!spec) playSound('round_start');
    recordEvent('roundReady', { data: data });
};

$lib.Wordstack.turnStart = function (data) {
    $stage.game.display.html(getCharDisplayText($data._chars));

    if ($data._myPair) {
        $("#game-user-" + $data._myPair.player1).addClass("game-user-current");
        $("#game-user-" + $data._myPair.player2).addClass("game-user-current");
    }

    if (!$data._replay) {
        $stage.game.here.css('display', "block");
        $stage.game.hereText.prop('readonly', false);
        if (mobile) $stage.game.hereText.val("").focus();
        else $stage.talk.focus();
    }

    ws.onmessage = _onMessage;
    clearInterval($data._tTime);
    clearTrespasses();
    $data._speed = 1;
    $data._tTime = addInterval(turnGoing, TICK);
    $data.turnTime = data.roundTime;
    $data._turnTime = data.roundTime;
    $data._roundTime = data.roundTime;
    playBGM('jaqwi');
    recordEvent('turnStart', {
        data: data
    });
};

$lib.Wordstack.turnGoing = function () {
    if (!$data.room) clearInterval($data._tTime);
    $data._turnTime -= TICK;
    $data._roundTime -= TICK;

    $stage.game.turnBar
        .width($data._turnTime / $data.turnTime * 100 + "%")
        .html(($data._turnTime * 0.001).toFixed(1) + L['SECOND']);
    $stage.game.roundBar
        .width($data._roundTime / $data.room.time * 0.1 + "%")
        .html(($data._roundTime * 0.001).toFixed(1) + L['SECOND']);

    if (!$stage.game.roundBar.hasClass("round-extreme")) if ($data._roundTime <= 5000) $stage.game.roundBar.addClass("round-extreme");

    if ($data._roundTime <= 10000 && $data.bgm && $data.bgm.key === "jaqwi") {
        var currentTime = $data.bgm.audio ? $data.bgm.audio.currentTime : (audioContext.currentTime - $data.bgm.startedAt);
        stopBGM();
        $data.bgm = playBGM('jaqwiF');
        if ($data.bgm.audio) $data.bgm.audio.currentTime = currentTime;
        else $data.bgm.startedAt = audioContext.currentTime - currentTime;
    }

    if ($data._chars) {
        var charCount = $data._chars.length;
        var barWidth = (charCount / 8) * 100;
        if (barWidth > 100) barWidth = 100;

        var barColor = charCount >= 8 ? "#FF3333" : "#70712D";

        $(".jjo-turn-time .graph-bar")
            .width(barWidth + "%")
            .html(charCount + " / 8")
            .css({ 'text-align': "center", 'background-color': barColor });
    }
};

$lib.Wordstack.turnEnd = function (id, data) {
    var $sc = $("<div>")
        .addClass("deltaScore")
        .html((data.score > 0) ? ("+" + data.score) : data.score);
    var $uc = $("#game-user-" + id);

    if (data.status === 1) {
        if ($data.id == id) {
            $data.chain++;
            playSound('mission');
            pushHistory(data.text, "");

            if (mobile) $stage.game.hereText.val("");
            else $stage.talk.val("");

            if (data.playerChars) {
                $data._chars = data.playerChars.slice();
            }
        } else if (data.opponentId === $data.id) {
            if (data.opponentChars) {
                $data._chars = data.opponentChars.slice();
            }
        }

        if ($data._chars && $data._chars.length > 0) {
            $stage.game.display.html(getCharDisplayText($data._chars));
        }

        addScore(id, data.score);
        drawObtainedScore($uc, $sc);
        updateScore(id, getScore(id));

        $stage.game.chain.html($data.chain);

        checkFailCombo();
    } else {
        clearInterval($data._tTime);
        $stage.game.here.hide();
        stopBGM();
        playSound('horr');

        setTimeout(function () {
            if ($data._round < $data.room.round) {
                recordEvent('roundReady');
            } else {
                recordEvent('roundEnd');
            }
        }, 3000);
    }
};

function getCharDisplayText(chars) {
    if (!chars || !chars.length) {
        return "?";
    }
    return chars.join(" ");
}

$lib.Wordstack.submit = function (text) {
    if (!text || !$data._chars) {
        return false;
    }

    var firstChar = text.charAt(0);

    if (!$data._chars.includes(firstChar)) {
        return false;
    }

    return true;
};

$lib.Wordstack.roundEnd = function () {
    clearInterval($data._tTime);
    stopBGM();
    $stage.game.hereText.prop('readonly', true);
};

$lib.Wordstack.turnHint = function (data) {
    playSound('fail');
};

$lib.Wordstack.turnError = function (code, text) {
    var displayText = (L['turnError_' + code] ? (L['turnError_' + code] + ": ") : "") + text;

    $stage.game.display.empty().append($("<label>").addClass("game-fail-text")
        .text(displayText)
    );
    playSound('fail');
    clearTimeout($data._errorTimeout);
    $data._errorTimeout = addTimeout(function () {
        if ($data._chars && $data._chars.length > 0) {
            $stage.game.display.html(getCharDisplayText($data._chars));
        }
    }, 1800);
};
