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
var fs = require('fs');
var path = require('path');
var DB;
var DIC;
var SPEEDQUIZ_DATA;

var ROBOT_CATCH_RATE = [0.05, 0.1, 0.3, 0.5, 0.7, 1];
var ROBOT_TYPE_COEF = [2000, 1200, 800, 300, 100, 0];

exports.init = function (_DB, _DIC) {
	DB = _DB;
	DIC = _DIC;

	try {
		var filePath = path.join(__dirname, '../../data/speedquiz.json');
		var rawData = fs.readFileSync(filePath, 'utf8');
		SPEEDQUIZ_DATA = JSON.parse(rawData);
	} catch (err) {
		console.error('speedquiz.json 파일을 읽을 수 없습니다.:', err.message);
		SPEEDQUIZ_DATA = {};
	}
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
	var topics = my.opts.speedquizpick;

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
	my.game.hum = my.game.seq ? my.game.seq.length : 1;
	my.game.themeBonus = 0.3 * Math.log(0.6 * ijl + 1);

	if (my.game.round <= my.round) {
		my.game.topic = topics[Math.floor(Math.random() * ijl)];

		getQuestion.call(my, my.game.topic).then(function ($q) {
			if (!my.game || !my.game.done) {
				return;
			}

			if (!$q) {
				getQuestion.call(my, my.game.topic, true).then(function ($q2) {
					if (!my.game || !my.game.done) {
						return;
					}

					if (!$q2) {
						clearTimeout(my.game._pqTimer);
						my.game.late = true;
						try {
							my.byMaster('turnEnd', { answer: "", error: "NO_QUESTION_FOUND" });
						} catch (e) {
							console.error('Speedquiz: NO_QUESTION_FOUND error:', e);
						}
						clearTimeout(my.game._rrt);
						my.game._rrt = setTimeout(function () {
							exports.roundReady.call(my);
						}, 2500);
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

	if (!my.game.question) {
		console.error('Speedquiz: turnStart - No question set');
		return;
	}

	try {
		my.game.roundAt = (new Date()).getTime();
		my.game.hintCount = 0;
		my.game.primary = 0;
		clearTimeout(my.game.qTimer);
		my.game.qTimer = setTimeout(function () { exports.turnEnd.call(my); }, my.game.roundTime);
		if (!my.opts.nohint) {
			clearTimeout(my.game.hintTimer);
			my.game.hintTimer = setTimeout(function () { turnHint.call(my); }, my.game.roundTime * 0.333);
			clearTimeout(my.game.hintTimer2);
			my.game.hintTimer2 = setTimeout(function () { turnHint.call(my); }, my.game.roundTime * 0.667);
		}

		my.byMaster('turnStart', {
			question: my.game.question,
			roundTime: my.game.roundTime
		}, true);

		for (i in my.game.robots) {
			my.readyRobot(my.game.robots[i]);
		}
	} catch (err) {
		console.error('Speedquiz: turnStart error:', err);
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

	clearTimeout(my.game._pqTimer);
	clearTimeout(my.game.qTimer);
	clearTimeout(my.game.hintTimer);
	clearTimeout(my.game.hintTimer2);

	for (i in my.game.robots) {
		if (my.game.robots[i]) {
			clearTimeout(my.game.robots[i]._timer);
		}
	}

	clearTimeout(my.game._rrt);
	my.game._rrt = setTimeout(function () {
		exports.roundReady.call(my);
	}, 2500);
};

exports.submit = function (client, text) {
	var my = this;
	var score, t, i;
	var now = (new Date()).getTime();
	var play = (my.game.seq ? my.game.seq.includes(client.id) : false) || client.robot;
	var gu = my.game.giveup ? my.game.giveup.includes(client.id) : false;

	if (!my.game.winner) return;

	var isCorrect = checkAnswer(text, my.game.answer, my.game.topic);

	if (my.game.winner.indexOf(client.id) == -1 && isCorrect && play && !gu) {
		t = now - my.game.roundAt;
		if (my.game.primary == 0) if (my.game.roundTime - t > 10000) {
			clearTimeout(my.game.qTimer);
			my.game.qTimer = setTimeout(function () { exports.turnEnd.call(my); }, 10000);
			for (i in my.game.robots) {
				if (my.game.roundTime > my.game.robots[i]._delay) {
					clearTimeout(my.game.robots[i]._timer);
					if (client != my.game.robots[i]) if (Math.random() < ROBOT_CATCH_RATE[my.game.robots[i].level]) {
						var randomDelay = Math.floor(Math.random() * 90) + 10;
						my.game.robots[i]._timer = setTimeout((function (robot, answer, level) {
							return function () {
								if (my.turnRobot) {
									my.turnRobot(robot, answer);
								}
							};
						})(my.game.robots[i], my.game.answer, my.game.robots[i].level), ROBOT_TYPE_COEF[my.game.robots[i].level] + randomDelay);
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
		if (!my.opts.nohint) {
			while (my.game.hintCount < my.game.hints.length) {
				turnHint.call(my);
			}
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
	var rank = my.game.hum - my.game.primary + 3;
	var tr = 1 - delay / my.game.roundTime;
	var score = 6 * Math.pow(rank, 1.4) * (0.5 + 0.5 * tr);

	return Math.round(score * my.game.themeBonus);
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
			robot._timer = setTimeout((function (r, answer) {
				return function () {
					if (my.turnRobot) {
						my.turnRobot(r, answer);
					}
				};
			})(robot, my.game.answer), delay);
			robot._delay = delay;
			break;
		}
	}
};

function getQuestion(topics, ignoreDone) {
	var my = this;
	var R = new Lizard.Tail();

	try {
		var questionList = SPEEDQUIZ_DATA[topics];

		if (!questionList || !Array.isArray(questionList) || questionList.length === 0) {
			setTimeout(function () { R.go(null); }, 5);
			return R;
		}

		var availableQuestions = questionList.filter(function (q, idx) {
			if (ignoreDone) return true;
			if (!Array.isArray(my.game.done)) return true;
			return my.game.done.indexOf(idx) === -1;
		});

		if (availableQuestions.length === 0) {
			my.game.done = [];
			availableQuestions = questionList;
		}

		if (availableQuestions.length === 0) {
			setTimeout(function () { R.go(null); }, 5);
			return R;
		}

		var pick = Math.floor(Math.random() * availableQuestions.length);
		var q = availableQuestions[pick];

		if (!q || !q.question || !q.answer) {
			setTimeout(function () { R.go(null); }, 5);
			return R;
		}

		var originalIndex = questionList.indexOf(q);

		setTimeout(function () {
			R.go({
				topic: topics,
				question: q.question,
				answer: q.answer,
				_id: originalIndex
			});
		}, 5);

	} catch (err) {
		console.error('Speedquiz: getQuestion error:', err);
		setTimeout(function () { R.go(null); }, 5);
	}

	return R;
}

function processQuestion($q) {
	var my = this;
	var lang = my.rule.lang;

	if (!$q || !$q.question || !$q.answer) {
		console.error('Speedquiz: processQuestion - Invalid question object');
		clearTimeout(my.game._pqTimer);
		clearTimeout(my.game._rrt);
		my.game._rrt = setTimeout(function () {
			exports.roundReady.call(my);
		}, 2500);
		return;
	}

	my.game.late = false;
	my.game.question = $q.question;
	my.game.answer = $q.answer;

	if (!Array.isArray(my.game.done)) {
		my.game.done = [];
	}
	my.game.done.push($q._id);

	try {
		my.game.hints = getHints($q.answer, lang);
	} catch (err) {
		console.error('Speedquiz: Error generating hints:', err);
		my.game.hints = [];
	}

	try {
		my.byMaster('roundReady', {
			round: my.game.round,
			topic: my.game.topic,
			difficulty: 1
		}, true);
	} catch (err) {
		console.error('Speedquiz: processQuestion byMaster error:', err);
		throw err;
	}

	clearTimeout(my.game._pqTimer);
	my.game._pqTimer = setTimeout(function () {
		try {
			exports.turnStart.call(my);
		} catch (err) {
			console.error('Speedquiz: turnStart error:', err);
		}
	}, 2400);
}
function getHints(answer, lang) {
	var hints = [];
	var h1, h2;

	if (lang === 'ko') {
		try {
			h1 = getConsonants(answer, Math.ceil(answer.length / 3));

			var attempts = 0;
			do {
				h2 = getConsonants(answer, Math.ceil(answer.length / 2));
				attempts++;
			} while (h1 == h2 && attempts < 10);

			hints.push(h1);
			hints.push(h2);
		} catch (err) {
			console.error('Speedquiz: Error generating Korean hints:', err);
			hints = ['힌트1', '힌트2'];
		}
	} else {
		hints.push(answer.length + ' letters');
		hints.push(answer.charAt(0).toUpperCase());
	}

	return hints;
}
function getConsonants(word, lucky) {
	var R = "";
	var i, len = word.length;
	var c;
	var rv = [];

	lucky = lucky || 0;
	while (lucky > 0) {
		c = Math.floor(Math.random() * len);
		if (rv.includes(c)) continue;
		rv.push(c);
		lucky--;
	}
	for (i = 0; i < len; i++) {
		c = word.charCodeAt(i) - 44032;

		if (c < 0 || rv.includes(i)) {
			R += word.charAt(i);
			continue;
		} else {
			c = Math.floor(c / 588);
			if (!Const || !Const.INIT_SOUNDS || !Const.INIT_SOUNDS[c]) {
				console.error('Speedquiz: getConsonants - Const.INIT_SOUNDS[' + c + '] is undefined');
				R += '?';
			} else {
				R += Const.INIT_SOUNDS[c];
			}
		}
	}
	return R;
}
function checkAnswer(input, answer, topic) {
	if (!input || !answer) return false;

	return input === answer;
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