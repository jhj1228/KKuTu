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

var fs = require("fs");
var http = require("http");
var https = require("https");
var crypto = require("crypto");
var JLog = require("../sub/jjlog");
var GLOBAL = require("../sub/global.json");
var Const = require("../const");

var CONFIG_PATH = require.resolve("../sub/serverlist.json");
var configMtime = 0;
var config = loadConfig() || { servers: [], links: [] };
var cache = { list: [], updatedAt: 0 };
var getLocalSeek = function () { return []; };
var refreshing = false;
var waiters = [];
var rerun = false;

function fileMtime() {
	try {
		return fs.statSync(CONFIG_PATH).mtimeMs;
	} catch (err) {
		return 0;
	}
}
function loadConfig() {
	var c;

	configMtime = fileMtime();
	try {
		c = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
	} catch (err) {
		JLog.warn("serverlist.json 을 읽을 수 없습니다 (기존 설정 유지): " + err.message);
		return null;
	}
	if (!c || typeof c !== 'object') return null;
	if (!Array.isArray(c.servers)) c.servers = [];
	if (!Array.isArray(c.links)) c.links = [];

	var changed = false;

	c.servers.forEach(function (s) {
		if (!s.id) {
			s.id = newId();
			changed = true;
		}
	});
	if (changed) saveConfig(c);
	return c;
}
function saveConfig(c) {
	var tmp = CONFIG_PATH + ".tmp";

	fs.writeFileSync(tmp, JSON.stringify(c, null, "\t") + "\n", "utf8");
	fs.renameSync(tmp, CONFIG_PATH);
	configMtime = fileMtime();
}
function syncConfig() {
	var m = fileMtime();
	var c;

	if (!m || m === configMtime) return false;
	c = loadConfig();
	if (!c) return false;
	config = c;
	JLog.info("[serverlist] serverlist.json 변경을 반영했습니다.");
	return true;
}
function newId() {
	return crypto.randomBytes(6).toString("hex");
}

function summarize(list, max) {
	var online = 0, capacity = 0;

	(list || []).forEach(function (v) {
		if (v === null || v === undefined) return;
		online += Number(v) || 0;
		capacity += max;
	});
	return { online: online, capacity: capacity };
}
function applyLocal(info) {
	var s = summarize(getLocalSeek(), Const.KKUTU_MAX);

	info.online = s.online;
	info.capacity = s.capacity;
	info.ping = 0;
	info.alive = s.capacity > 0;
	return info;
}
var MAX_REDIRECTS = 3;

function fetchJSON(url, timeout, callback, redirects) {
	var done = false;
	var started = Date.now();
	var lib = url.indexOf("https:") === 0 ? https : http;
	var req;

	redirects = redirects || 0;
	function finish(err, data) {
		if (done) return;
		done = true;
		callback(err, data, Date.now() - started);
	}
	try {
		req = lib.get(url, {
			timeout: timeout,
			headers: { 'Accept': "application/json", 'User-Agent': "Mozilla/5.0 (compatible; KKuTu-ServerList)" }
		}, function (res) {
			var body = "";
			var next;

			if ([301, 302, 303, 307, 308].indexOf(res.statusCode) !== -1 && res.headers.location) {
				res.resume();
				if (redirects >= MAX_REDIRECTS) return finish(new Error("리다이렉트가 너무 많습니다"));
				try {
					next = new URL(res.headers.location, url).toString();
				} catch (e) {
					return finish(e);
				}
				if (!/^https?:/i.test(next)) return finish(new Error("잘못된 리다이렉트: " + next));
				done = true;
				return fetchJSON(next, timeout, callback, redirects + 1);
			}
			if (res.statusCode !== 200) {
				res.resume();
				return finish(new Error("HTTP " + res.statusCode));
			}
			res.setEncoding("utf8");
			res.on('data', function (chunk) {
				body += chunk;
				if (body.length > 65536) req.destroy(new Error("응답이 너무 큽니다"));
			});
			res.on('end', function () {
				try { finish(null, JSON.parse(body)); } catch (e) { finish(e); }
			});
		});
		req.on('timeout', function () { req.destroy(new Error("timeout")); });
		req.on('error', function (err) { finish(err); });
	} catch (err) {
		finish(err);
	}
}
function probe(server, callback) {
	var info = {
		id: server.id,
		name: server.name || "",
		homepage: server.homepage || "",
		repository: server.repository || "",
		icon: server.icon || "/img/kkutu/logo.png",
		enter: server.enter || server.homepage || "",
		online: 0,
		capacity: 0,
		ping: null,
		alive: false,
		self: !!server.self
	};

	if (server.self) return callback(applyLocal(info));
	var api = server.api || (String(server.homepage || "").replace(/\/+$/, "") + "/servers");

	fetchJSON(api, config.timeout || 5000, function (err, data, elapsed) {
		if (!err && data && Array.isArray(data.list)) {
			var s = summarize(data.list, Number(data.max) || Const.KKUTU_MAX);

			info.online = s.online;
			info.capacity = s.capacity;
			info.ping = elapsed;
			info.alive = true;
		}
		callback(info);
	});
}
function refresh(callback) {
	if (callback) waiters.push(callback);
	if (refreshing) {
		rerun = true;
		return;
	}
	refreshing = true;

	var servers = config.servers.slice();
	var result = new Array(servers.length);
	var left = servers.length;

	if (!left) return complete();
	servers.forEach(function (server, i) {
		probe(server, function (info) {
			result[i] = info;
			if (--left === 0) complete();
		});
	});
	function complete() {
		cache = { list: result, updatedAt: Date.now() };
		refreshing = false;
		if (rerun) {
			rerun = false;
			return refresh();
		}

		var w = waiters;

		waiters = [];
		w.forEach(function (f) { f(); });
	}
}

function isAdmin(req) {
	var profile = req.session && req.session.profile;

	return !!(profile && profile.id && GLOBAL.ADMIN.indexOf(profile.id) !== -1);
}
function cleanURL(v, allowRelative) {
	v = String(v || "").trim();
	if (!v) return "";
	if (v.length > 300) return null;
	if (/^https?:\/\/[^\s"'<>]+$/i.test(v)) return v;
	if (allowRelative && /^\/[^\s"'<>]*$/.test(v)) return v;
	return null;
}
function readServerForm(body) {
	var name = String(body.name || "").trim();
	var self = body.self === "true" || body.self === "1" || body.self === "on";
	var s = { name: name };
	var fields = { homepage: false, api: false, enter: true, repository: false, icon: true };
	var k, v;

	if (!name || name.length > 30) return { error: "서버 이름은 1~30자로 입력해 주세요." };
	for (k in fields) {
		v = cleanURL(body[k], fields[k]);
		if (v === null) return { error: k + " 주소가 올바르지 않습니다. (http:// 또는 https:// 로 시작)" };
		if (v) s[k] = v;
	}
	if (!self && !s.homepage && !s.api) return { error: "홈페이지 주소를 입력해 주세요." };
	if (self) s.self = true;
	return { server: s };
}
function rawServers() {
	return config.servers.map(function (s) {
		return {
			id: s.id,
			name: s.name || "",
			homepage: s.homepage || "",
			api: s.api || "",
			enter: s.enter || "",
			repository: s.repository || "",
			icon: s.icon || "",
			self: !!s.self
		};
	});
}

exports.run = function (Server, page, localSeek) {
	if (typeof localSeek === 'function') getLocalSeek = localSeek;

	function adminOnly(req, res, next) {
		if (!isAdmin(req)) return res.status(403).send({ error: "권한이 없습니다." });
		syncConfig();
		next();
	}
	function afterChange(res) {
		try {
			saveConfig(config);
		} catch (err) {
			JLog.warn("serverlist.json 저장 실패: " + err.message);
			return res.status(500).send({ error: "설정 파일을 저장하지 못했습니다." });
		}
		refresh(function () { res.send({ ok: true }); });
	}

	Server.get("/serverlist", function (req, res) {
		if (syncConfig()) refresh();
		page(req, res, "serverlist", {
			'_page': "serverlist",
			'bg': "gamebg.png",
			'SL_NOTICE': config.notice || "",
			'SL_LINKS': config.links,
			'SL_ADMIN': isAdmin(req)
		});
	});
	Server.get("/serverlist/data", function (req, res) {
		if (syncConfig()) refresh(send);
		else send();

		function send() {
			var list = cache.list.map(function (v) {
				return (v && v.self) ? applyLocal(Object.assign({}, v)) : v;
			});
			var data = { list: list, updatedAt: cache.updatedAt };

			if (isAdmin(req)) data.raw = rawServers();
			res.set('Cache-Control', "no-store");
			res.send(data);
		}
	});
	Server.post("/serverlist/admin/save", adminOnly, function (req, res) {
		var form = readServerForm(req.body || {});
		var id = String((req.body || {}).id || "");
		var target;

		if (form.error) return res.status(400).send({ error: form.error });
		if (id) {
			target = config.servers.find(function (s) { return s.id === id; });
			if (!target) return res.status(404).send({ error: "서버를 찾을 수 없습니다." });
			Object.keys(target).forEach(function (k) { if (k !== 'id') delete target[k]; });
			Object.assign(target, form.server);
		} else {
			form.server.id = newId();
			config.servers.push(form.server);
		}
		JLog.info("[serverlist] " + req.session.profile.id + " " + (id ? "수정" : "등록") + ": " + form.server.name);
		afterChange(res);
	});
	Server.post("/serverlist/admin/delete", adminOnly, function (req, res) {
		var id = String((req.body || {}).id || "");
		var i = config.servers.findIndex(function (s) { return s.id === id; });

		if (i === -1) return res.status(404).send({ error: "서버를 찾을 수 없습니다." });
		JLog.info("[serverlist] " + req.session.profile.id + " 삭제: " + config.servers[i].name);
		config.servers.splice(i, 1);
		afterChange(res);
	});
	Server.post("/serverlist/admin/move", adminOnly, function (req, res) {
		var id = String((req.body || {}).id || "");
		var dir = (req.body || {}).dir === "up" ? -1 : 1;
		var i = config.servers.findIndex(function (s) { return s.id === id; });
		var j = i + dir;

		if (i === -1) return res.status(404).send({ error: "서버를 찾을 수 없습니다." });
		if (j < 0 || j >= config.servers.length) return res.send({ ok: true });
		config.servers.splice(j, 0, config.servers.splice(i, 1)[0]);
		afterChange(res);
	});

	refresh();
	setInterval(function () {
		syncConfig();
		refresh();
	}, Math.max(10000, Number(config.refreshInterval) || 60000));
};
