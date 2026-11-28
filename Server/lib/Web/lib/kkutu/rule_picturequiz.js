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

var PQ_SEND_INTERVAL = 30;
var PQ_PATH_MAX = 64;
var PQ_HISTORY_MAX = 50;

function sendPictureQuiz(data) {
    flushPath();
    send('pictureQuiz', data);
}

function flushPath() {
    var my = $data.pq;

    clearTimeout(my.pathTimer);
    my.pathTimer = null;
    if (!my.path.length) return;
    send('pictureQuiz', {
        eventtype: "mousemove",
        path: my.path
    });
    my.path = [];
}

function pushPath(pos) {
    var my = $data.pq;

    my.path.push(pos);
    if (my.path.length >= PQ_PATH_MAX) flushPath();
    else if (!my.pathTimer) my.pathTimer = setTimeout(flushPath, PQ_SEND_INTERVAL);
}

function listener(event) {
    if ($data.pq.myturn) {
        switch (event.type) {
            case "mousedown":
            case "touchstart":
                event.preventDefault();
                var downPos = getMousePos(event);
                $data.pq.drawing = true;
                $lib.PictureQuiz.initDraw(downPos);
                sendPictureQuiz({
                    eventtype: "mousedown",
                    pos: downPos
                });
                break;
            case "mousemove":
            case "touchmove":
                if (event.type === "mousemove" && !event.buttons) break;
                if (event.type === "touchmove") event.preventDefault();
                if (!$data.pq.drawing) break;
                var pos = getMousePos(event);
                if (pos.X === $data.pq.pos.X && pos.Y === $data.pq.pos.Y) break;
                $lib.PictureQuiz.draw(pos);
                pushPath(pos);
                break;
            case "mouseup":
            case "touchend":
            case "touchcancel":
            case "mouseleave":
                if (!$data.pq.drawing) break;
                $data.pq.drawing = false;
                $lib.PictureQuiz.finishDraw();
                sendPictureQuiz({
                    eventtype: "mouseup"
                });
                break;
        }
    }
}

$lib.PictureQuiz.saveHistory = function () {
    var my = $data.pq;

    if (!my.history) return;
    my.history.push(my.ctx.getImageData(0, 0, my.canvas.width, my.canvas.height));
    if (my.history.length > PQ_HISTORY_MAX) my.history.shift();
};

$lib.PictureQuiz.undo = function () {
    var my = $data.pq;
    var prev = my.history && my.history.pop();

    if (!prev) return;
    my.pos.drawable = false;
    my.ctx.beginPath();
    my.ctx.putImageData(prev, 0, 0);
};

$lib.PictureQuiz.initDraw = function (pos) {
    var my = $data.pq;
    if (!my.pos.drawable) $lib.PictureQuiz.saveHistory();
    my.ctx.beginPath();
    my.pos.drawable = true;
    my.pos.X = pos.X;
    my.pos.Y = pos.Y;
    my.ctx.moveTo(my.pos.X, my.pos.Y);
    my.ctx.lineJoin = 'round';
    my.ctx.lineCap = 'round';
    my.ctx.lineTo(my.pos.X + 0.01, my.pos.Y + 0.01);
    my.ctx.stroke();
    my.ctx.beginPath();
    my.ctx.moveTo(my.pos.X, my.pos.Y);
};

$lib.PictureQuiz.draw = function (pos) {
    var my = $data.pq;
    if (my.pos.drawable) {
        var startX = my.pos.X;
        var startY = my.pos.Y;
        var dx = pos.X - startX;
        var dy = pos.Y - startY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var steps = Math.max(1, Math.min(18, Math.ceil(distance / 1.2)));
        var i, t, ix, iy, midX, midY;

        for (i = 1; i <= steps; i++) {
            t = i / steps;
            ix = startX + dx * t;
            iy = startY + dy * t;
            midX = (my.pos.X + ix) / 2;
            midY = (my.pos.Y + iy) / 2;

            my.ctx.quadraticCurveTo(my.pos.X, my.pos.Y, midX, midY);
            my.pos.X = ix;
            my.pos.Y = iy;
        }
        my.ctx.stroke();
    }
};

$lib.PictureQuiz.finishDraw = function () {
    var my = $data.pq;
    if (my.pos.drawable) {
        my.ctx.lineTo(my.pos.X, my.pos.Y);
        my.ctx.stroke();
    }
    my.pos.drawable = false;
    my.pos.X = -1;
    my.pos.Y = -1;
};

$lib.PictureQuiz.clearAll = function () {
    var my = $data.pq;
    $lib.PictureQuiz.saveHistory();
    my.ctx.fillStyle = "#fff";
    my.ctx.fillRect(0, 0, canvas.width, canvas.height);
};

$lib.PictureQuiz.setColor = function (c) {
    var my = $data.pq;
    var color;

    if (/^#[0-9a-f]{6}$/i.test(c)) color = c;
    else if (/^[a-z]+$/.test(c)) color = $(".pqColor[color=" + c + "]").css("background-color");
    my.ctx.strokeStyle = color || "#000000";
};

$lib.PictureQuiz.setWidth = function (c) {
    var my = $data.pq;
    my.ctx.lineWidth = c * 3;
};

function getMousePos(evt) {
    var rect = $data.pq.canvas.getBoundingClientRect();
    var point = evt;

    if (evt.touches && evt.touches.length) point = evt.touches[0];
    else if (evt.changedTouches && evt.changedTouches.length) point = evt.changedTouches[0];

    return {
        X: Math.round((point.clientX - rect.left) * 10) / 10,
        Y: Math.round((point.clientY - rect.top) * 10) / 10
    };
}

$lib.PictureQuiz.roundReady = function (data) {
    var tv = L['jqTheme'] + ": " + L['theme_' + data.theme];
    var turnPlayer = $data.room.game.seq[data.turn];
    var turnPlayerId = (turnPlayer && typeof turnPlayer === 'object') ? turnPlayer.id : turnPlayer;
    var myturn = $data.id == turnPlayerId;

    clearBoard();
    $(".jjoriping,.rounds,.game-body").addClass("pq");
    $data._roundTime = $data.room.time * 1000;
    $data._fastTime = 10000;
    $stage.game.display.html($("<div id='PQBar'>" + tv + "</div>"));
    $stage.game.display.append($("<canvas id='PQCanvas' width='298' height='250'></canvas>"));
    $stage.game.items.hide();
    $stage.game.hints.hide();
    drawRound(data.round);
    playSound('round_start');
    clearInterval($data._tTime);
    $(".pqcmd").show().css('opacity', 1).css('visibility', 'hidden');

    $(".pqColor, #pq-custom-pick").removeClass("pqSelected");
    $(".pqWidth").removeClass("pqSelected");
    $(".pqColor[color=black]").addClass("pqSelected");
    $(".pqWidth[width=1]").addClass("pqSelected");
    $(".game-user-pqturn").remove();
    $("#game-user-" + turnPlayerId).append('<div class="game-user-pqturn">술래</div>');
    if ($data.box && $data.box.hasOwnProperty("pkg_specialpalette")) {
        $(".pqNoSpecialColorList").hide();
        $(".pqSpecialColorList").show();
    } else {
        $(".pqNoSpecialColorList").show();
        $(".pqSpecialColorList").hide();
    }
    if (myturn) {
        $(".pqcmd").css('visibility', 'visible');
        $(".pqColor").off("click");
        $(".pqWidth").off("click");
        $(".pqColor").click(function () {
            $(".pqColor, #pq-custom-pick").removeClass("pqSelected");
            $(this).addClass("pqSelected");
            $lib.PictureQuiz.setColor($(this).attr("color"));
            sendPictureQuiz({
                eventtype: "setColor",
                color: $(this).attr("color")
            });
        });
        $("#pq-custom-pick").off("click").on("click", function () {
            $("#pq-custom-color").trigger("click");
        });
        $("#pq-custom-color").off("change").on("change", function () {
            var hex = String(this.value || "").toLowerCase();

            if (!/^#[0-9a-f]{6}$/.test(hex)) return;
            $(".pqColor").removeClass("pqSelected");
            $("#pq-custom-pick").addClass("pqSelected")[0].style.setProperty("--pq-custom", hex);
            $lib.PictureQuiz.setColor(hex);
            sendPictureQuiz({
                eventtype: "setColor",
                color: hex
            });
        });
        $(".pqWidth").click(function () {
            $(".pqWidth").removeClass("pqSelected");
            $(this).addClass("pqSelected");
            $lib.PictureQuiz.setWidth($(this).attr("width"));
            sendPictureQuiz({
                eventtype: "setWidth",
                width: $(this).attr("width")
            });
        });
    } else {
        $(".pqcmd").css('visibility', 'hidden');
        $(".pqColor").off("click");
        $(".pqWidth").off("click");
        $("#pq-custom-pick").off("click");
        $("#pq-custom-color").off("change");
    }
    $("#pq_clear").off("click");
    $("#pq_clear").click(function () {
        if (myturn) {
            $lib.PictureQuiz.clearAll();
            sendPictureQuiz({
                eventtype: "clearall"
            });
        }
    });
    $("#pq_undo").off("click");
    $("#pq_undo").click(function () {
        if (!myturn || $data.pq.drawing || !$data.pq.history.length) return;
        $lib.PictureQuiz.undo();
        sendPictureQuiz({
            eventtype: "undo"
        });
    });
    if ($data.pq) clearTimeout($data.pq.pathTimer);
    $data.pq = {};
    $data.pq.myturn = myturn;
    $data.pq.drawing = false;
    $data.pq.path = [];
    $data.pq.pathTimer = null;
    $data.pq.canvas = canvas = document.getElementById("PQCanvas");
    $data.pq.ctx = ctx = canvas.getContext("2d", { willReadFrequently: true });
    $data.pq.ctx.imageSmoothingEnabled = true;
    $data.pq.ctx.lineWidth = 3;
    $lib.PictureQuiz.clearAll();
    $data.pq.history = [];
    $data.pq.pos = {
        drawable: false,
        x: -1,
        y: -1
    };
    canvas.addEventListener('mousedown', listener);
    canvas.addEventListener('mousemove', listener);
    canvas.addEventListener('mouseup', listener);
    canvas.addEventListener('mouseleave', listener);
    canvas.addEventListener('touchstart', listener);
    canvas.addEventListener('touchmove', listener);
    canvas.addEventListener('touchend', listener);
    canvas.addEventListener('touchcancel', listener);
    document.removeEventListener('mouseup', listener);
    document.removeEventListener('touchend', listener);
    document.removeEventListener('touchcancel', listener);
    document.addEventListener('mouseup', listener);
    document.addEventListener('touchend', listener);
    document.addEventListener('touchcancel', listener);
};

$lib.PictureQuiz.drawCanvas = function (data) {
    switch (data.eventtype) {
        case "mousedown":
            $lib.PictureQuiz.initDraw(data.pos);
            break;
        case "mousemove":
            data.path.forEach($lib.PictureQuiz.draw);
            break;
        case "mouseup":
            $lib.PictureQuiz.finishDraw();
            break;
        case "clearall":
            $lib.PictureQuiz.clearAll();
            break;
        case "undo":
            $lib.PictureQuiz.undo();
            break;
        case "setColor":
            $lib.PictureQuiz.setColor(data.color);
            break;
        case "setWidth":
            $lib.PictureQuiz.setWidth(data.width);
            break;
    }
};

$lib.PictureQuiz.turnStart = function (data) {
    var payload = data;
    var turnOwnerId = data && data.ID !== undefined ? data.ID : null;
    var isDrawer = turnOwnerId !== null && turnOwnerId == $data.id;
    var canPlay = $data.room && $data.room.game && $data.room.game.seq && $data.room.game.seq.some(function (v) {
        var id = (v && typeof v === 'object') ? v.id : v;
        return id == $data.id;
    });

    if (data && data.ID !== undefined) {
        payload = (data.ID == $data.id) ? data.ME : data.OTHER;
    }

    $(".game-user-current").removeClass("game-user-current");
    $(".game-user-bomb").removeClass("game-user-bomb");
    $data._char = payload ? payload.char : "";

    if (canPlay) {
        $stage.game.here.hide();
        $stage.talk.focus();
        $data._relay = true;
    } else {
        $stage.game.here.hide();
        $data._relay = false;
    }

    $("#PQBar").append("<br>" + $data._char);
    clearInterval($data._tTime);
    $data._tTime = addInterval(turnGoing, TICK);
    playBGM('jaqwi');
};

$lib.PictureQuiz.turnGoing = function () {
    var $rtb = $stage.game.roundBar;
    var bRate;
    var tt;

    if (!$data.room) clearInterval($data._tTime);
    $data._roundTime -= TICK;

    tt = $data._spectate ? L['stat_spectate'] : ($data._roundTime * 0.001).toFixed(1) + L['SECOND'];
    $rtb
        .width($data._roundTime / $data.room.time * 0.1 + "%")
        .html(tt);

    if (!$rtb.hasClass("round-extreme"))
        if ($data._roundTime <= $data._fastTime) {
            var bgm = $data.bgm;

            if (bgm && bgm.audio && isFinite(bgm.audio.duration) && bgm.audio.duration > 0) {
                bRate = bgm.audio.currentTime / bgm.audio.duration;
            }
            if (bgm && bgm.audio && bgm.audio.paused) stopBGM();
            else playBGM('jaqwiF');
            if (isFinite(bRate) && $data.bgm && $data.bgm.audio) {
                $data.bgm.audio.currentTime = $data.bgm.audio.duration * bRate;
            }
            $rtb.addClass("round-extreme");
        }
};

$lib.PictureQuiz.turnHint = function (data) {
    playSound('mission');
    pushHint(data.hint);
};

$lib.PictureQuiz.turnEnd = function (id, data) {
    var $sc = $("<div>").addClass("deltaScore").html("+" + data.score);
    var $uc = $("#game-user-" + id);

    if (data.giveup) {
        $uc.removeClass("game-user-current").addClass("game-user-bomb");
    } else if (data.answer) {
        $stage.game.here.hide();
        $stage.game.display.html($("<label>").css('color', "#FFFF44").html(data.answer));
        stopBGM();
        playSound('horr');
    } else {
        // if(data.mean) turnHint(data);
        if (id == $data.id) $stage.game.here.hide();
        addScore(id, data.score);
        if ($data._roundTime > 10000) $data._roundTime = 10000;
        drawObtainedScore($uc, $sc);
        updateScore(id, getScore(id)).addClass("game-user-current");
        playSound('success');
    }
};