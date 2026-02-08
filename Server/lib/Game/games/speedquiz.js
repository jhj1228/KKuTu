/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 *
 * This program is free software: you can redistri-bute it and/or modify
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

var ROBOT_CATCH_RATE = [0.05, 0.1, 0.3, 0.5, 0.7, 1];
var ROBOT_TYPE_COEF = [2000, 1200, 800, 300, 100, 0];

exports.init = function (_DB, _DIC) {
	DB = _DB;
	DIC = _DIC;
};

exports.getTitle = function () {
	var R = new Lizard.Tail();
	var my = this;

	my.game.done = [];
	setTimeout(function () {
		R.go("①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳");
	}, 500);
	return R;
};

exports.roundReady = function () {
	var my = this;
	var topics = my.opts.quizpick;

	if (!topics || !Array.isArray(topics) || topics.length === 0) {
		return;
	}

	var ijl = topics.length;

	clearTimeout(my.game.qTimer);
	clearTimeout(my.game.hintTimer);
	clearTimeout(my.game.hintTimer2);

	my.game.winner = [];
	my.game.giveup = [];
	my.game.primary = 0;
	my.game.round++;
	my.game.roundTime = my.time * 1000;

	if (my.game.round <= my.round) {
		my.game.topic = topics[Math.floor(Math.random() * ijl)];

		getQuestion.call(my, my.game.topic).then(function ($q) {
			if (!my.game.done) return;

			if (!$q) {
				getQuestion.call(my, my.game.topic, true).then(function ($q2) {
					if (!my.game.done) return;

					if (!$q2) {
						my.game.late = true;
						my.byMaster('turnEnd', { answer: "", error: "NO_QUESTION_FOUND" });
						my.game._rrt = setTimeout(my.roundReady, 2500);
						return;
					}

					processQuestion.call(my, $q2);
				});
				return;
			}

			processQuestion.call(my, $q);
		});
	} else {
		my.roundEnd();
	}
};

exports.turnStart = function () {
	var my = this;
	var i;

	if (!my.game.question) return;

	my.game.roundAt = (new Date()).getTime();
	my.game.hintCount = 0;
	my.game.primary = 0;
	my.game.qTimer = setTimeout(my.turnEnd, my.game.roundTime);
	my.game.hintTimer = setTimeout(function () { turnHint.call(my); }, my.game.roundTime * 0.333);
	my.game.hintTimer2 = setTimeout(function () { turnHint.call(my); }, my.game.roundTime * 0.667);

	my.byMaster('turnStart', {
		question: my.game.question,
		roundTime: my.game.roundTime
	}, true);

	for (i in my.game.robots) {
		my.readyRobot(my.game.robots[i]);
	}
};

function turnHint() {
	var my = this;

	my.byMaster('turnHint', {
		hint: my.game.hints[my.game.hintCount++]
	}, true);
}

exports.turnEnd = function () {
	var my = this;
	var i;

	if (my.game.question) {
		my.game.late = true;
		my.byMaster('turnEnd', {
			answer: my.game.answer || ""
		});
	}

	for (i in my.game.robots) {
		clearTimeout(my.game.robots[i]._timer);
	}

	my.game._rrt = setTimeout(my.roundReady, 2500);
};

exports.submit = function (client, text) {
	var my = this;
	var score, t, i;
	var now = (new Date()).getTime();
	var play = (my.game.seq ? my.game.seq.includes(client.id) : false) || client.robot;
	var gu = my.game.giveup ? my.game.giveup.includes(client.id) : false;

	if (!my.game.winner) return;

	var isCorrect = checkAnswer(text, my.game.answer, my.game.aliases, my.game.topic, my.rule.lang);

	if (my.game.winner.indexOf(client.id) == -1 && isCorrect && play && !gu) {
		t = now - my.game.roundAt;
		if (my.game.primary == 0) if (my.game.roundTime - t > 10000) {
			clearTimeout(my.game.qTimer);
			my.game.qTimer = setTimeout(my.turnEnd, 10000);
			for (i in my.game.robots) {
				if (my.game.roundTime > my.game.robots[i]._delay) {
					clearTimeout(my.game.robots[i]._timer);
					if (client != my.game.robots[i]) if (Math.random() < ROBOT_CATCH_RATE[my.game.robots[i].level]) {
						var randomDelay = Math.floor(Math.random() * 90) + 10;
						my.game.robots[i]._timer = setTimeout(my.turnRobot, ROBOT_TYPE_COEF[my.game.robots[i].level] + randomDelay, my.game.robots[i], my.game.answer);
					}
				}
			}
		}
		clearTimeout(my.game.hintTimer);
		clearTimeout(my.game.hintTimer2);
		score = my.getScore(text, t);
		if (typeof score !== 'number' || isNaN(score)) {
			score = 0;
		}
		my.game.primary++;
		my.game.winner.push(client.id);
		if (!client.game) {
			client.game = { score: 0, bonus: 0, team: 0 };
		}
		if (typeof client.game.score !== 'number' || isNaN(client.game.score)) {
			client.game.score = 0;
		}
		client.game.score += score;
		client.publish('turnEnd', {
			target: client.id,
			ok: true,
			value: text,
			score: score,
			bonus: 0,
			totalScore: client.game.score
		}, true);
		client.invokeWordPiece(text, 0.9);
		while (my.game.hintCount < my.game.hints.length) {
			turnHint.call(my);
		}
	} else if (play && !gu && (text == "gg" || text == "ㅈㅈ")) {
		my.game.giveup.push(client.id);
		client.publish('turnEnd', {
			target: client.id,
			giveup: true
		}, true);
	} else {
		if (my.game.primary > 0) {
			client.chat(maskText(text, my.game.answer));
		} else {
			client.chat(text);
		}
	}
	if (play) if (my.game.primary + my.game.giveup.length >= my.game.seq.length) {
		clearTimeout(my.game.hintTimer);
		clearTimeout(my.game.hintTimer2);
		clearTimeout(my.game.qTimer);
		my.turnEnd();
	}
};

exports.getScore = function (text, delay) {
	var my = this;
	var hum = (typeof my.game.hum === 'number') ? my.game.hum : 1;
	var primary = (typeof my.game.primary === 'number') ? my.game.primary : 0;
	var roundTime = (typeof my.game.roundTime === 'number' && my.game.roundTime > 0) ? my.game.roundTime : 1;

	var rank = Math.max(1, hum - primary + 3);
	var tr = 1 - delay / roundTime;
	if (isNaN(tr) || tr < 0) tr = 0;
	if (tr > 1) tr = 1;

	return 0;
};

exports.readyRobot = function (robot) {
	var my = this;
	var level = robot.level;
	var delay;
	var i;

	if (!my.game.answer) return;
	clearTimeout(robot._timer);
	robot._delay = 99999999;
	for (i = 0; i < 2; i++) {
		if (Math.random() < ROBOT_CATCH_RATE[level]) {
			var randomDelay = Math.floor(Math.random() * 90) + 10;
			delay = my.game.roundTime / 3 * i + my.game.answer.length * ROBOT_TYPE_COEF[level] + randomDelay;
			robot._timer = setTimeout(my.turnRobot, delay, robot, my.game.answer);
			robot._delay = delay;
			break;
		}
	}
};

function getQuestion(topics, ignoreDone) {
	var my = this;
	var R = new Lizard.Tail();
	var lang = my.rule.lang;

	if (topics === 'MATH') {
		var problem = Const.generateCalcProblem(chain);

		setTimeout(function () {
			R.go({
				topic: 'MATH',
				question: problem.question,
				answer: String(problem.answer),
				aliases: null,
			});
		}, 10);
		return R;
	}

	var args = [];

	args.push(['topic', topics]);

	if (!ignoreDone && Array.isArray(my.game.done) && my.game.done.length > 0) {
		args.push(['_id', { $nin: my.game.done }]);
	}

	DB.kkutu.speedquiz.find(...args).on(function ($res) {
		if (!$res || $res.length === 0) return R.go(null);

		var pick = Math.floor(Math.random() * $res.length);
		var q = $res[pick];

		R.go({
			topic: q.topic,
			question: q.question,
			answer: q.answer_ko || q.answer,
			aliases: q.aliases_ko || q.aliases,
			_id: q._id
		});
	});

	return R;
}

function processQuestion($q) {
	var my = this;
	var lang = my.rule.lang;

	my.game.late = false;
	my.game.question = $q.question;
	my.game.answer = $q.answer;
	my.game.aliases = $q.aliases ? $q.aliases.split(',').map(function (s) { return s.trim(); }) : [];
	my.game.done.push($q._id);

	my.game.hints = getHints($q.answer, lang);

	my.byMaster('roundReady', {
		round: my.game.round,
		topic: my.game.topic,
	}, true);
	setTimeout(my.turnStart, 2400);
}
function getHints(answer, lang) {
	var hints = [];

	hints.push(answer.length + (lang === 'ko' ? '글자' : ' letters'));

	hints.push(answer.charAt(0).toUpperCase());
	return hints;
}
function checkAnswer(input, answer, aliases, topic) {
	if (!input || !answer) return false;

	if (topic === 'MATH') {
		return Number(input) === Number(answer);
	}

	if (input === answer) return true;
	if (aliases && aliases.includes(input)) return true;
	return false;
}
function maskText(text, answer) {
	if (!answer || answer.length === 0) return text;

	var mask = new Array(text.length).fill(false);
	var found = false;
	var lowerAns = answer.toLowerCase();
	var lowerText = text.toLowerCase();

	for (var i = 0; i < text.length; i++) {
		for (var len = 2; i + len <= text.length; len++) {
			var sub = lowerText.substr(i, len);
			if (lowerAns.includes(sub)) {
				for (var k = 0; k < len; k++) mask[i + k] = true;
				found = true;
			}
		}
	}

	if (found) {
		var censored = "";
		for (var j = 0; j < text.length; j++) {
			censored += mask[j] ? "○" : text[j];
		}
		return censored;
	} else {
		return text;
	}
}