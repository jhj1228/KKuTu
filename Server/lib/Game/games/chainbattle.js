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

var RIEUL_TO_NIEUN = [4449, 4450, 4457, 4460, 4462, 4467];
var RIEUL_TO_IEUNG = [4451, 4455, 4456, 4461, 4466, 4469];
var NIEUN_TO_IEUNG = [4455, 4461, 4466, 4469];

function getMission(lang) {
	return lang == 'ko'
		? Const.MISSION_ko[Math.floor(Math.random() * Const.MISSION_ko.length)]
		: Const.MISSION_en[Math.floor(Math.random() * Const.MISSION_en.length)];
}

function getSubChar(char) {
	var code, k, ca, cb, changed;

	if (!char || this.opts.due) return char;
	code = char.charCodeAt(0);
	if (code < 44032) return char;

	k = code - 0xAC00;
	if (k < 0 || k > 11171) return char;

	ca = [Math.floor(k / 28 / 21), Math.floor(k / 28) % 21, k % 28];
	cb = [ca[0] + 0x1100, ca[1] + 0x1161, ca[2] + 0x11A7];
	changed = false;

	if (cb[0] == 4357) {
		if (RIEUL_TO_NIEUN.includes(cb[1])) {
			cb[0] = 4354;
			changed = true;
		} else if (RIEUL_TO_IEUNG.includes(cb[1])) {
			cb[0] = 4363;
			changed = true;
		}
	} else if (cb[0] == 4354 && NIEUN_TO_IEUNG.includes(cb[1])) {
		cb[0] = 4363;
		changed = true;
	}

	if (!changed) return char;
	cb[0] -= 0x1100;
	cb[1] -= 0x1161;
	cb[2] -= 0x11A7;
	return String.fromCharCode(((cb[0] * 21) + cb[1]) * 28 + cb[2] + 0xAC00);
}

function isKoreanWord(text) {
	for (var i = 0; i < text.length; i++) {
		if (text.charCodeAt(i) < 0xAC00 || text.charCodeAt(i) > 0xD7A3) return false;
	}
	return true;
}

function hasFollowingWord(char) {
	var my = this;
	var R = new Lizard.Tail();
	var subChar = getSubChar.call(my, char);
	var expression = subChar != char ? '^(' + char + '|' + subChar + ')' : '^' + char;
	var args = [['_id', new RegExp(expression)]];

	if (my.rule.lang == 'ko' && !my.opts.moreword) args.push(['type', Const.KOR_GROUP]);
	my.getWordTable().find.apply(my.getWordTable(), args).limit(1).on(function (words) {
		R.go(words.length > 0);
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
	var example;
	var initial;

	if (!my.rule || !my.rule.lang) {
		R.go('undefinedd');
		return R;
	}

	example = Const.EXAMPLE_TITLE[my.rule.lang];
	my.game.dic = {};
	initial = 44032 + 588 * Math.floor(Math.random() * 18);

	function tryTitle(height) {
		if (height > 50) {
			R.go(example);
			return;
		}

		var args = [[
			'_id',
			new RegExp('^[\\u' + initial.toString(16) + '-\\u' + (initial + 587).toString(16) + '].{' + Math.max(1, my.round - 1) + '}$')
		]];

		if (!my.opts.moreword) args.push(['type', Const.KOR_GROUP]);
		my.getWordTable(my.rule.lang).find.apply(my.getWordTable(my.rule.lang), args).limit(20).on(function (words) {
			var candidates;

			if (!words.length) {
				tryTitle(height + 10);
				return;
			}

			candidates = words.sort(function () { return Math.random() - 0.5; });
			checkTitle(candidates.shift()._id).then(function checkNext(title) {
				if (title) R.go(title);
				else if (candidates.length) checkTitle(candidates.shift()._id).then(checkNext);
				else R.go(example);
			});
		});
	}

	function checkTitle(title) {
		var R = new Lizard.Tail();
		var checks = [];

		for (var i = 0; i < title.length; i++) {
			checks.push(hasFollowingWord.call(my, title.charAt(i)));
		}
		Lizard.all(checks).then(function (results) {
			for (var i in results) {
				if (!results[i]) {
					R.go(null);
					return;
				}
			}
			R.go(title);
		});
		return R;
	}

	tryTitle(10);
	return R;
};

exports.roundInfo = function (client) {
	var my = this;

	if (!my.game.chars || !my.game.chars[client.id]) return;
	client.send('roundReady', {
		round: my.game.round,
		char: my.game.chars[client.id],
		mission: my.game.mission && my.game.mission[client.id],
		enter: true
	}, true);
	if (!my.game.late) {
		client.send('turnStart', { roundTime: my.game.roundTime }, true);
	}
};

exports.roundReady = function () {
	var my = this;
	var players;

	my.game.round++;
	my.game.roundTime = my.time * 1000;
	if (my.game.round > my.round) {
		my.roundEnd();
		return;
	}

	my.game.chain = {};
	my.game.chars = {};
	my.game.mission = {};
	players = my.game.seq.map(function (entry) { return entry.robot ? entry.id : entry; });
	players.forEach(function (id) {
		my.game.chain[id] = [];
		my.game.chars[id] = my.game.title[my.game.round - 1];
		if (my.opts.mission) my.game.mission[id] = getMission(my.rule.lang);
		var client = DIC[id];
		if (client) {
			client.send('roundReady', {
				round: my.game.round,
				char: my.game.chars[id],
				mission: my.game.mission[id]
			}, true);
		}
	});

	setTimeout(function () {
		my.turnStart();
	}, 2400);
};

exports.turnStart = function () {
	var my = this;

	my.game.late = false;
	my.game.qTimer = setTimeout(function () {
		my.turnEnd();
	}, my.game.roundTime);
	my.byMaster('turnStart', { roundTime: my.game.roundTime }, true);
};

exports.turnEnd = function () {
	var my = this;

	if (!my.game.seq) return;
	my.game.late = true;
	my.byMaster('turnEnd', { ok: false }, true);
	my.game._rrt = setTimeout(function () {
		my.roundReady();
	}, my.game.round == my.round ? 3000 : 10000);
};

exports.submit = function (client, text) {
	var my = this;
	var lang = my.rule.lang;
	var requiredChar;
	var alternateChar;

	if (!client || !client.id || !my.game.chars || my.game.late) return;
	if (!my.game.chars[client.id]) return client.chat(text);

	requiredChar = my.game.chars[client.id];
	alternateChar = getSubChar.call(my, requiredChar);
	if (!text || text.length < 2 || (text.charAt(0) != requiredChar && text.charAt(0) != alternateChar)) {
		return client.chat(text);
	}
	if (lang == 'ko' && !isKoreanWord(text)) return client.chat(text);
	if (my.game.chain[client.id].includes(text)) {
		return client.send('turnError', { code: 409, value: text }, true);
	}

	var args = [['_id', text]];
	if (lang == 'ko' && !my.opts.moreword) args.push(['type', Const.KOR_GROUP]);
	if (lang != 'ko') args.push(['_id', Const.ENG_ID]);

	my.getWordTable(lang).findOne.apply(my.getWordTable(lang), args).on(function ($doc) {
		if (!my.game || my.game.late || !my.game.chain[client.id]) return;
		if (!$doc) return client.send('turnError', { code: 404, value: text }, true);
		if (!my.opts.injeong && ($doc.flag & Const.KOR_FLAG.INJEONG)) {
			return client.send('turnError', { code: 404, value: text }, true);
		}
		if (my.opts.strict && (!$doc.type.match(Const.KOR_STRICT) || $doc.flag >= 4)) {
			return client.send('turnError', { code: 406, value: text }, true);
		}
		if (my.opts.loanword && ($doc.flag & Const.KOR_FLAG.LOANWORD)) {
			return client.send('turnError', { code: 405, value: text }, true);
		}

		var approve = function () {
			var baseScore = my.getScore(text, client.id, true);
			var score = my.getScore(text, client.id);
			var bonus = score - baseScore;

			my.game.chain[client.id].push(text);
			my.game.chars[client.id] = text.charAt(text.length - 1);
			client.game.score += score;
			client.publish('turnEnd', {
				ok: true,
				target: client.id,
				value: text,
				mean: $doc.mean,
				theme: $doc.theme,
				wc: $doc.type,
				score: score,
				bonus: bonus,
				chars: my.game.chars,
				mission: my.game.mission && my.game.mission[client.id]
			}, true);
			if (!client.robot) {
				client.invokeWordPiece(text, 1);
				my.getWordTable(lang).update(['_id', text]).set(['hit', $doc.hit + 1]).on();
			}
		};

		hasFollowingWord.call(my, text.charAt(text.length - 1)).then(function (available) {
			if (available) approve();
			else client.send('turnError', { code: 403, value: text }, true);
		});
	});
};

exports.getScore = function (text, clientId, skipMission) {
	var my = this;
	var score = Const.getPreScore(text, my.game.chain[clientId], 1);
	var mission = my.game.mission && my.game.mission[clientId];
	var matches;

	if (!skipMission && mission && (matches = text.match(new RegExp(mission, 'g')))) {
		score += score * 0.5 * matches.length;
		my.game.mission[clientId] = getMission(my.rule.lang);
	}
	return Math.round(score);
};
