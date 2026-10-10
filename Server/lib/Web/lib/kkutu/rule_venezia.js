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

var VENEZIA_WIDTH = 298;
var VENEZIA_HEIGHT = 280;
var VENEZIA_MAX_LIVES = 10;

function stopVenezia() {
	if ($data.venezia && $data.venezia.frame) {
		cancelAnimationFrame($data.venezia.frame);
		$data.venezia.frame = null;
	}
}

function updateVeneziaLives() {
	var game = $data.venezia;
	var percent;

	if (!game) return;

	percent = game.lives / VENEZIA_MAX_LIVES * 100;
	$(".jjo-turn-time .graph-bar")
		.width(percent + "%")
		.html(game.lives + " / " + VENEZIA_MAX_LIVES)
		.css({ 'text-align': "right", 'background-color': "#E64A4A" });
}

function drawVenezia() {
	var game = $data.venezia;
	var elapsed;
	var elapsedSinceLastDraw;
	var speed;
	var spawnInterval;
	var word;
	var i;
	var visibleWords = [];

	if (!game || !game.active) return;

	elapsed = Date.now() - game.startedAt;
	elapsedSinceLastDraw = Date.now() - game.lastDrawAt;
	game.lastDrawAt = Date.now();
	speed = 45 + Math.min(elapsed / game.roundTime, 1) * 110;
	spawnInterval = 1600 - Math.min(elapsed / game.roundTime, 1) * 950;
	while (game.nextIndex < game.list.length && elapsed >= game.nextIndex * spawnInterval) {
		game.words.push({
			index: game.nextIndex,
			text: game.list[game.nextIndex],
			x: 24 + Math.random() * (VENEZIA_WIDTH - 160),
			y: -24
		});
		game.nextIndex++;
	}

	game.ctx.fillStyle = "#FFFFFF";
	game.ctx.fillRect(0, 0, VENEZIA_WIDTH, VENEZIA_HEIGHT);
	game.ctx.font = "17px NBGothic";
	game.ctx.textBaseline = "top";
	for (i = 0; i < game.words.length; i++) {
		word = game.words[i];
		word.y += speed * (elapsedSinceLastDraw / 1000);
		if (word.y >= VENEZIA_HEIGHT && !word.missed) {
			word.missed = true;
			if (game.lives > 0) {
				game.lives--;
				updateVeneziaLives();
			}
			if (game.lives == 0) {
				game.active = false;
				$data._relay = false;
				$stage.game.display.text("목숨을 모두 잃었습니다.");
				return;
			}
		}
		visibleWords.push(word);
		game.ctx.fillStyle = "#222222";
		game.ctx.fillText(word.text, word.x, word.y);
	}
	game.words = visibleWords;

	if (game.active) game.frame = requestAnimationFrame(drawVenezia);
}

$lib.Venezia.roundReady = function (data) {
	stopVenezia();
	clearBoard();
	$stage.box.game.addClass("venezia-mode");
	$stage.game.round.insertAfter($stage.box.game.find(".jjoEyeL"));
	$data._round = data.round;
	$data._roundTime = $data.room.time * 1000;
	$data._fastTime = 10000;
	$data.venezia = {
		active: false,
		canvas: $("<canvas>")
			.attr({ width: VENEZIA_WIDTH, height: VENEZIA_HEIGHT })
			.css({ display: "block", margin: "0 auto", background: "#FFFFFF" })[0],
		list: data.list || [],
		words: [],
		nextIndex: 0,
		lives: VENEZIA_MAX_LIVES,
		roundTime: $data._roundTime
	};
	$stage.game.display.empty().append($data.venezia.canvas);
	$data.venezia.ctx = $data.venezia.canvas.getContext("2d");
	updateVeneziaLives();
	drawRound(data.round);
	playSound('round_start');
	recordEvent('roundReady', { data: data });
};

$lib.Venezia.turnStart = function (data) {
	var game = $data.venezia;

	if (!$data._spectate) {
		$stage.talk.val("").focus();
	}
	game.roundTime = data.roundTime;
	game.startedAt = Date.now();
	game.lastDrawAt = game.startedAt;
	game.active = true;
	$data._relay = true;
	ws.onmessage = _onMessage;
	clearTrespasses();
	clearInterval($data._tTime);
	$data._tTime = addInterval($lib.Venezia.turnGoing, TICK);
	$data._roundTime = data.roundTime;
	playBGM('jaqwi');
	drawVenezia();
	recordEvent('turnStart', { data: data });
};

$lib.Venezia.turnGoing = $lib.Jaqwi.turnGoing;

$lib.Venezia.turnEnd = function (id, data) {
	var game = $data.venezia;

	if (data.error) {
		playSound('fail');
		return;
	}
	if (data.ok) {
		if ($data.id == id && game) {
			game.words = game.words.filter(function (word) {
				return word.index !== data.index;
			});
			playSound('mission');
		}
		addScore(id, data.score);
		updateScore(id, getScore(id));
		return;
	}

	if (game) game.active = false;
	$data._relay = false;
	stopVenezia();
	clearInterval($data._tTime);
	stopBGM();
	playSound('horr');
};
