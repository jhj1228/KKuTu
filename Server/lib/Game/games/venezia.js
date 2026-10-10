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

var Lizard = require('../../sub/lizard');
var DB;
var DIC;

var LIST_LENGTH = 120;

function traverse(func) {
	var my = this;
	var i;
	var client;

	for (i in my.game.seq) {
		client = DIC[my.game.seq[i]];
		if (client && client.game) func(client);
	}
}

exports.init = function (_DB, _DIC) {
	DB = _DB;
	DIC = _DIC;
};

exports.getTitle = function () {
	var R = new Lizard.Tail();
	var my = this;

	my.getWordTable().find(['_id', /^[가-힣]{1,5}$/], ['hit', { $gte: 1 }]).limit(416).on(function ($res) {
		var words = $res.map(function (item) {
			return item._id;
		});
		var lists = [];
		var i;
		var j;

		for (i = 0; i < my.round; i++) {
			lists[i] = [];
			for (j = 0; j < LIST_LENGTH; j++) {
				lists[i].push(words[Math.floor(Math.random() * words.length)]);
			}
		}
		my.game.lists = lists;
		R.go("①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳");
	});

	traverse.call(my, function (client) {
		client.game.veneziaScore = 0;
	});
	return R;
};

exports.roundReady = function () {
	var my = this;
	var scores = {};

	if (!my.game.lists) return;

	my.game.round++;
	my.game.roundTime = my.time * 1000;
	if (my.game.round <= my.round) {
		my.game.words = my.game.lists.shift();
		my.byMaster('roundReady', {
			round: my.game.round,
			list: my.game.words
		}, true);
		setTimeout(my.turnStart, 2400);
	} else {
		traverse.call(my, function (client) {
			scores[client.id] = client.game.veneziaScore;
		});
		my.roundEnd({ scores: scores });
	}
};

exports.turnStart = function () {
	var my = this;

	my.game.late = false;
	traverse.call(my, function (client) {
		client.game.veneziaAnswered = {};
	});
	my.game.qTimer = setTimeout(my.turnEnd, my.game.roundTime);
	my.byMaster('turnStart', { roundTime: my.game.roundTime }, true);
};

exports.turnEnd = function () {
	var my = this;

	my.game.late = true;
	my.byMaster('turnEnd', { ok: false });
	my.game._rrt = setTimeout(my.roundReady, (my.game.round == my.round) ? 3000 : 10000);
};

exports.submit = function (client, text, index) {
	var my = this;
	var score;

	if (!client.game || my.game.late) return;

	text = text.trim();
	if (!Number.isInteger(index) || client.game.veneziaAnswered[index] || my.game.words[index] !== text) {
		client.send('turnEnd', { error: true });
		return;
	}

	score = text.length * 10;
	client.game.veneziaAnswered[index] = true;
	client.game.veneziaScore += score;
	client.game.score += score;
	client.publish('turnEnd', {
		cs: client.game.score,
		target: client.id,
		ok: true,
		value: text,
		index: index,
		score: score
	}, true);
};
