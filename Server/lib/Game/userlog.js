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


var KEEP_TIME = 30 * 60 * 1000;
var MAX_ENTRIES = 500;
var MAX_TEXT = 200;
var LOG = {};

exports.KEEP_TIME = KEEP_TIME;

exports.formatTime = function (t, withDate) {
	var d = new Date(t + 9 * 3600 * 1000).toISOString();

	return withDate ? d.slice(0, 10) + " " + d.slice(11, 19) : d.slice(11, 19);
};

function clip(text) {
	text = String(text === undefined || text === null ? "" : text).replace(/\s+/g, " ").trim();
	return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + "…" : text;
}
function prune(id, now) {
	var list = LOG[id];
	var i = 0;

	if (!list) return;
	while (i < list.length && now - list[i].t > KEEP_TIME) i++;
	if (i) list.splice(0, i);
	if (!list.length) delete LOG[id];
}
function describe(msg, nameOf) {
	if (!msg || typeof msg != "object") return null;
	switch (msg.type) {
		case 'talk':
			if (msg.whisper) return "귓속말 → " + clip(msg.whisper) + ": " + clip(msg.value);
			return (msg.relay ? "입력: " : "채팅: ") + clip(msg.value);
		case 'enter':
			if (msg.id) return clip(msg.id) + "번 방 " + (msg.spectate ? "관전" : "입장");
			return "방 만들기: \"" + clip(msg.title) + "\"";
		case 'setRoom': return "방 설정 변경: \"" + clip(msg.title) + "\"";
		case 'leave': return "방 나가기";
		case 'ready': return "준비";
		case 'start': return "게임 시작";
		case 'practice': return "연습 시작";
		case 'kick': return (msg.robot ? "봇 내보내기" : "강퇴: " + nameOf(msg.target));
		case 'kickVote': return "강퇴 투표: " + (msg.agree ? "찬성" : "반대");
		case 'invite': return "초대: " + (msg.target == "AI" ? "끄투 봇" : nameOf(msg.target));
		case 'handover': return "방장 위임: " + nameOf(msg.target);
		case 'report': return "신고: " + nameOf(msg.target) + " (" + clip(msg.reason) + ")";
		case 'updateProfile': return "프로필 변경";
		case 'friendAdd': return "친구 신청: " + nameOf(msg.target);
		default: return null;
	}
}
exports.describe = describe;
exports.add = function (id, place, text) {
	var now = Date.now();
	var list;

	if (!id || !text) return;
	list = LOG[id] || (LOG[id] = []);
	list.push({ t: now, place: Number(place) || 0, text: text });
	if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES);
	prune(id, now);
};
exports.record = function (id, place, msg, nameOf) {
	exports.add(id, place, describe(msg, nameOf || String));
};
exports.dump = function (id) {
	var list;

	prune(id, Date.now());
	list = LOG[id] || [];
	return list.map(function (item) {
		return "[" + exports.formatTime(item.t) + "] "
			+ (item.place ? item.place + "번 방" : "로비") + " | " + item.text;
	});
};
setInterval(function () {
	var now = Date.now();
	var id;

	for (id in LOG) prune(id, now);
}, 5 * 60 * 1000).unref();
