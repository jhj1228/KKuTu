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

var CHAINBATTLE_RIEUL_TO_NIEUN = [4449, 4450, 4457, 4460, 4462, 4467];
var CHAINBATTLE_RIEUL_TO_IEUNG = [4451, 4455, 4456, 4461, 4466, 4469];
var CHAINBATTLE_NIEUN_TO_IEUNG = [4455, 4461, 4466, 4469];

function getChainbattleDueumChar(char) {
	var code, k, ca, cb, changed;

	if (!$data.room || $data.room.opts.due) return char;
	code = char.charCodeAt(0);
	if (code < 44032) return char;

	k = code - 0xAC00;
	if (k < 0 || k > 11171) return char;
	ca = [Math.floor(k / 28 / 21), Math.floor(k / 28) % 21, k % 28];
	cb = [ca[0] + 0x1100, ca[1] + 0x1161, ca[2] + 0x11A7];
	changed = false;

	if (cb[0] == 4357) {
		if (CHAINBATTLE_RIEUL_TO_NIEUN.includes(cb[1])) {
			cb[0] = 4354;
			changed = true;
		} else if (CHAINBATTLE_RIEUL_TO_IEUNG.includes(cb[1])) {
			cb[0] = 4363;
			changed = true;
		}
	} else if (cb[0] == 4354 && CHAINBATTLE_NIEUN_TO_IEUNG.includes(cb[1])) {
		cb[0] = 4363;
		changed = true;
	}

	if (!changed) return char;
	cb[0] -= 0x1100;
	cb[1] -= 0x1161;
	cb[2] -= 0x11A7;
	return String.fromCharCode(((cb[0] * 21) + cb[1]) * 28 + cb[2] + 0xAC00);
}

function formatChainbattleChar(char) {
	var dueumChar = getChainbattleDueumChar(char);

	return dueumChar == char ? char : char + '(' + dueumChar + ')';
}

$lib.Chainbattle.roundReady = function (data) {
	clearBoard();
	$data._round = data.round;
	$data._roundTime = $data.room.time * 1000;
	$data.chain = 0;

	if (!$data._spectate) {
		$data._char = data.char;
		$stage.game.display.html(formatChainbattleChar($data._char));
	} else {
		$stage.game.display.html(L['spectateChainbattle']);
	}
	$stage.game.chain.show().html($data.chain);
	if ($data.room.opts.mission) {
		$stage.game.items.show().css('opacity', 1).html($data.mission = data.mission);
	}
	drawRound(data.round);
	if (!$data._spectate) playSound('round_start');
	clearInterval($data._tTime);
	recordEvent('roundReady', { data: data });
};

$lib.Chainbattle.turnStart = function (data) {
	if (!$data._spectate) {
		$stage.game.here.show();
		if (mobile) $stage.game.hereText.val('').focus();
		else $stage.talk.val('').focus();
		$stage.game.display.html(formatChainbattleChar($data._char));
		playBGM('jaqwi');
	} else {
		$stage.game.display.html(L['spectateChainbattle']);
	}

	ws.onmessage = _onMessage;
	clearInterval($data._tTime);
	clearTrespasses();
	$('.jjo-turn-time .graph-bar').width('100%').css('background-color', '#E6E846');
	$data._roundTime = data.roundTime;
	$data._fastTime = 10000;
	$data._tTime = addInterval($lib.Chainbattle.turnGoing, TICK);
	recordEvent('turnStart', { data: data });
};

$lib.Chainbattle.turnGoing = function () {
	var $roundBar = $stage.game.roundBar;
	var bgmRate;

	if (!$data.room) clearInterval($data._tTime);
	$data._roundTime -= TICK;
	$roundBar
		.width($data._roundTime / $data.room.time * 0.1 + '%')
		.html($data._spectate ? L['stat_spectate'] : ($data._roundTime * 0.001).toFixed(1) + L['SECOND']);

	if (!$data._spectate && $data.bgm && !$roundBar.hasClass('round-extreme') && $data._roundTime <= $data._fastTime) {
		bgmRate = $data.bgm.currentTime / $data.bgm.duration;
		if ($data.bgm.paused) stopBGM();
		else playBGM('jaqwiF');
		$data.bgm.currentTime = $data.bgm.duration * bgmRate;
		$roundBar.addClass('round-extreme');
	}
};

$lib.Chainbattle.turnEnd = function (id, data) {
	var $user = $('#game-user-' + id);
	var $score = $('<div>').addClass('deltaScore').html(data.score > 0 ? '+' + (data.score - data.bonus) : data.score);

	if (data.ok) {
		pushHistory(data.value, data.mean, data.theme, data.wc);
		addScore(id, data.score);
		if (!$data._spectate && id == $data.id) {
			clearTimeout($data._fail);
			$data.chain++;
			$data._char = data.chars[$data.id];
			$stage.game.chain.html($data.chain);
			$stage.game.display.html(formatChainbattleChar($data._char));
			playSound('mission');
			if ($data.room.opts.mission && data.mission) {
				$stage.game.items.html($data.mission = data.mission);
			}
		}
	} else {
		clearInterval($data._tTime);
		$stage.game.here.hide();
		if (!$data._spectate) {
			stopBGM();
			playSound('horr');
		}
	}

	if (data.bonus) {
		mobile ? $score.html('+' + (data.score - data.bonus) + '+' + data.bonus) : addTimeout(function () {
			drawObtainedScore($user, $('<div>').addClass('deltaScore bonus').html('+' + data.bonus));
		}, 500);
	}
	if (data.ok) {
		drawObtainedScore($user, $score);
		updateScore(id, getScore(id));
	}
};
