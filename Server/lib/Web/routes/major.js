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

var Web = require("request");
var PgEscape = require("pg-escape");
var MainDB = require("../db");
var JLog = require("../../sub/jjlog");
var GLOBAL = require("../../sub/global.json");
var Const = require("../../const");

var ATTENDANCE_REWARD = 100;
var CF_STAR = "$WPC☆";
var CF_STAR_RATE = 0.1;
var LEVEL_REWARD = 5000;
var OKG_TIME = 600000;
var PLAY_REWARD_TIME = 1800000;
var MAX_OKG = 18;

function getToday() {
	var now = new Date();
	var month = now.getMonth() + 1;
	var day = now.getDate();

	return [now.getFullYear(), month < 10 ? '0' + month : month, day < 10 ? '0' + day : day].join('-');
}

function getRequiredScore(level) {
	return Math.round(
		(!(level % 5) * 0.3 + 1) * (!(level % 15) * 0.4 + 1) * (!(level % 45) * 0.5 + 1) * (
			120 + Math.floor(level / 5) * 60 + Math.floor(level * level / 225) * 120 + Math.floor(level * level / 2025) * 180
		)
	);
}

function getLevel(score) {
	var level = 1;
	var required = getRequiredScore(level);

	while (score >= required) {
		level++;
		required += getRequiredScore(level);
	}
	return level;
}

function getMailboxItems($user, claimed, today) {
	var data = $user.kkutu || {};
	var playTime = Number(data.playTime) || 0;
	var items = [];
	var i;
	var id;
	var level;

	today = today || getToday();

	function add(reward) {
		if (!claimed[reward.id]) items.push(reward);
	}

	add({ id: 'attendance:' + today, type: 'attendance', money: ATTENDANCE_REWARD });
	for (i = 1; i <= Math.min(MAX_OKG, Math.floor(playTime / OKG_TIME)); i++) {
		add({ id: 'okg:' + today + ':' + i, type: 'okg', dictPage: 1, count: i });
	}
	level = getLevel(Number(data.score) || 0);
	for (i = 10; i <= Math.floor(level / 10) * 10; i += 10) {
		add({ id: 'level:' + i, type: 'level', money: LEVEL_REWARD, level: i });
	}
	for (i = 1; i <= Math.floor(playTime / PLAY_REWARD_TIME); i++) {
		add({ id: 'play:' + today + ':' + i, type: 'play', dictPage: 2, count: i });
	}
	return items;
}

function getMailbox(uid, callback) {
	var today = getToday();
	var userQuery = "UPDATE users SET kkutu = CASE WHEN COALESCE(kkutu::jsonb->>'connectDate', '') <> " + PgEscape.literal(today) + " THEN jsonb_set(jsonb_set(COALESCE(kkutu::jsonb, '{}'::jsonb), '{connectDate}', to_jsonb(" + PgEscape.literal(today) + "::text), true), '{playTime}', '0'::jsonb, true)::json ELSE kkutu END WHERE _id = " + PgEscape.literal(uid) + " RETURNING kkutu";

	MainDB.users.direct(userQuery, function (error, $result) {
		var rewards;
		var values;
		var insertQuery;
		var expireQuery;
		var pendingQuery;

		if (error || !$result.rows.length) return callback(error || new Error('User not found'));
		rewards = getMailboxItems($result.rows[0], {}, today);
		values = rewards.map(function (reward) {
			return "(" + PgEscape.literal(uid) + ", " + PgEscape.literal(reward.id) + ")";
		}).join(', ');
		insertQuery = "INSERT INTO mailbox_rewards (user_id, reward_id) VALUES " + values + " ON CONFLICT DO NOTHING";
		expireQuery = "UPDATE mailbox_rewards SET expired_at = CURRENT_TIMESTAMP WHERE user_id = " + PgEscape.literal(uid) + " AND claimed_at IS NULL AND expired_at IS NULL AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'";
		pendingQuery = "SELECT reward_id FROM mailbox_rewards WHERE user_id = " + PgEscape.literal(uid) + " AND claimed_at IS NULL AND expired_at IS NULL AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'";

		MainDB.users.direct(insertQuery, function (insertError) {
			if (insertError) return callback(insertError);

			MainDB.users.direct(expireQuery, function (expireError) {
				if (expireError) return callback(expireError);

				MainDB.users.direct(pendingQuery, function (pendingError, $pending) {
					var pending = {};
			var i;

					if (pendingError) return callback(pendingError);
					for (i = 0; i < $pending.rows.length; i++) pending[$pending.rows[i].reward_id] = true;
					callback(null, rewards.filter(function (reward) { return pending[reward.id]; }));
				}, true);
			}, true);
		}, true);
	}, true);
}

function claimMailboxItem(uid, reward, callback) {
	var claim = "UPDATE mailbox_rewards SET claimed_at = CURRENT_TIMESTAMP WHERE user_id = " + PgEscape.literal(uid) + " AND reward_id = " + PgEscape.literal(reward.id) + " AND claimed_at IS NULL AND expired_at IS NULL AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' RETURNING 1";
	var sets = [];
	var query;

	if (reward.money) sets.push("money = money + " + reward.money);
	if (reward.dictPage) {
		sets.push("box = jsonb_set(COALESCE(box::jsonb, '{}'::jsonb), '{dictPage}', to_jsonb(COALESCE((COALESCE(box::jsonb, '{}'::jsonb)->>'dictPage')::integer, 0) + " + reward.dictPage + "), true)::json");
	}
	query = "WITH claim AS (" + claim + ") UPDATE users SET " + sets.join(', ') + " WHERE _id = " + PgEscape.literal(uid) + " AND EXISTS (SELECT 1 FROM claim) RETURNING money, box";

	MainDB.users.direct(query, function (error, $result) {
		if (error) return callback(error);
		if (!$result.rowCount) return callback(null, null);
		callback(null, $result.rows[0]);
	}, true);
}

function getProfileBadges(uid, callback) {
	MainDB.users.direct("SELECT badges FROM profile_badge WHERE user_id = " + PgEscape.literal(uid), function (error, $result) {
		var badges = [null, null, null];
		var saved, i;

		if (error) return callback(error);
		if ($result.rows.length) {
			try {
				saved = JSON.parse($result.rows[0].badges);
			} catch (e) {
				saved = [];
			}
			for (i = 0; i < 3; i++) badges[i] = (saved && saved[i]) || null;
		}
		callback(null, badges);
	}, true);
}
function getEnhanceLevels(uid, callback) {
	MainDB.users.direct("SELECT item_id, level FROM item_enhance WHERE user_id = " + PgEscape.literal(uid), function (error, $result) {
		var levels = {};
		var i;

		if (error) return callback(error);
		for (i = 0; i < $result.rows.length; i++) levels[$result.rows[i].item_id] = Number($result.rows[i].level);
		callback(null, levels);
	}, true);
}
function isEnhanceable(options) {
	var i;

	if (!options) return false;
	for (i in options) if (Const.ENHANCE.OPTIONS.includes(i)) return true;
	return false;
}
function hasItem($user, gid) {
	var bd = ($user.box || {})[gid];

	return !!bd && (bd.value > 0 || bd > 0);
}
function isEquipped($user, gid) {
	var part;

	for (part in ($user.equip || {})) if ($user.equip[part] == gid) return true;
	return false;
}
function obtain($user, key, value, term, addValue) {
	var now = (new Date()).getTime();

	if (term) {
		if ($user.box[key]) {
			if (addValue) $user.box[key].value += value;
			else $user.box[key].expire += term;
		} else $user.box[key] = { value: value, expire: Math.round(now * 0.001 + term) }
	} else {
		$user.box[key] = ($user.box[key] || 0) + value;
	}
}
function consume($user, key, value, force) {
	var bd = $user.box[key];

	if (bd.value) {
		// 기한이 끝날 때까지 box 자체에서 사라지지는 않는다. 기한 만료 여부 확인 시점: 1. 로그인 2. box 조회 3. 게임 결과 반영 직전 4. 해당 항목 사용 직전
		if ((bd.value -= value) <= 0) {
			if (force || !bd.expire) delete $user.box[key];
		}
	} else {
		if (($user.box[key] -= value) <= 0) delete $user.box[key];
	}
}

exports.run = function (Server, page) {
	Server.get("/mailbox", function (req, res) {
		if (!req.session.profile) return res.json({ error: 400 });
		if (req.session.profile.guest) return res.json({ error: 467 });

		getMailbox(req.session.profile.id, function (error, items) {
			if (error) return res.json({ error: 500 });
			res.json({ items: items });
		});
	});
	Server.post("/mailbox/claim", function (req, res) {
		if (!req.session.profile) return res.json({ error: 400 });
		if (req.session.profile.guest) return res.json({ error: 467 });

		var uid = req.session.profile.id;

		getMailbox(uid, function (error, items) {
			var reward;
			var i;

			if (error) return res.json({ error: 500 });
			for (i = 0; i < items.length; i++) if (items[i].id === req.body.id) reward = items[i];
			if (!reward) return res.json({ error: 430 });

			claimMailboxItem(uid, reward, function (claimError, $user) {
				if (claimError) return res.json({ error: 500 });
				if (!$user) return res.json({ error: 430 });
				res.json({ result: 200, money: $user.money, box: $user.box, reward: reward });
			});
		});
	});

	Server.get("/box", function (req, res) {
		if (req.session.profile) {
			/*if(Const.ADMIN.indexOf(req.session.profile.id) == -1){
				return res.send({ error: 555 });
			}*/
		} else {
			return res.send({ error: 400 });
		}
		MainDB.users.findOne(['_id', req.session.profile.id]).limit(['box', true]).on(function ($body) {
			if (!$body) {
				res.send({ error: 400 });
			} else {
				res.send($body.box);
			}
		});
	});
	Server.get("/help", function (req, res) {
		page(req, res, "help", {
			'KO_INJEONG': Const.KO_INJEONG
		});
	});
	Server.get("/ranking", function (req, res) {
		var pg = Number(req.query.p);
		var id = req.query.id;
		var limit = 15;
		var offset;
		var where;
		var query;
		var targetRank;
		var targetRangeStart;

		if (isNaN(pg) || pg < 0) pg = 0;
		offset = pg * limit;
		targetRank = id ? "(SELECT rank FROM ranked WHERE ranked.id = " + PgEscape.literal(id) + ")" : "";
		targetRangeStart = "GREATEST(0, LEAST(" + targetRank + " - 9, (SELECT COUNT(*) FROM ranked) - " + limit + "))";
		where = id
			? "ranked.rank >= " + targetRangeStart + " AND ranked.rank < " + targetRangeStart + " + " + limit
			: "ranked.rank >= " + offset + " AND ranked.rank < " + (offset + limit);
		query = "WITH ranked AS (" +
			"SELECT _id AS id, nickname, (kkutu->>'score')::numeric AS score, " +
			"ROW_NUMBER() OVER (ORDER BY (kkutu->>'score')::numeric DESC, _id) - 1 AS rank " +
			"FROM users " +
			"WHERE kkutu IS NOT NULL AND kkutu->>'score' ~ '^[0-9]+(\\.[0-9]+)?$'" +
			") " +
			"SELECT id, nickname, score, rank FROM ranked " +
			"WHERE " + where + " " +
			"ORDER BY rank LIMIT " + limit;

		MainDB.users.direct(query, function (error, $result) {
			if (error) {
				JLog.error("랭킹 조회 오류: " + error.toString());
				return res.send({ error: 500 });
			}
			res.send({
				page: id && $result.rows.length ? Math.floor(Number($result.rows[0].rank) / limit) : pg,
				target: id,
				data: $result.rows.map(function (item) {
					return {
						id: item.id,
						nickname: item.nickname,
						score: item.score,
						rank: Number(item.rank)
					};
				})
			});
		}, true);
	});
	Server.get("/injeong/:word", function (req, res) {
		if (!req.session.profile) return res.send({ error: 402 });
		var word = req.params.word;
		var theme = req.query.theme;
		var now = Date.now();

		if (now - req.session.injBefore < 2000) return res.send({ error: 429 });
		req.session.injBefore = now;

		MainDB.kkutu['ko'].findOne(['_id', word.replace(/[^가-힣0-9]/g, "")]).on(function ($word) {
			if ($word) return res.send({ error: 409 });
			MainDB.kkutu_injeong.findOne(['_id', word]).on(function ($ij) {
				if ($ij) {
					if ($ij.theme == '~') return res.send({ error: 406 });
					else return res.send({ error: 403 });
				}
				Web.get("https://namu.moe/w/" + encodeURI(word), function (err, _res) {
					if (err) return res.send({ error: 400 });
					else if (_res.statusCode != 200) return res.send({ error: 405 });
					MainDB.kkutu_injeong.insert(['_id', word], ['theme', theme], ['createdAt', now], ['writer', req.session.profile.id]).on(function ($res) {
						res.send({ message: "OK" });
					});
				});
			});
		});
	});
	Server.get("/cf/:word", function (req, res) {
		res.send(getCFRewards(req.params.word, Number(req.query.l || 0), req.query.b == "1"));
	});
	Server.get("/shop", function (req, res) {
		MainDB.kkutu_shop.find().limit(['cost', true], ['term', true], ['group', true], ['options', true], ['updatedAt', true]).on(function ($goods) {
			res.json({ goods: $goods });
		});
		// res.json({ error: 555 });
	});
	Server.get("/user/:id", function (req, res) {
		var userId = req.params.id;

		MainDB.users.findOne(['_id', userId]).limit(['nickname', true], ['exordial', true], ['kkutu', true], ['equip', true]).on(function ($user) {
			if (!$user) return res.json({ error: 405 });

			res.json({
				id: $user._id,
				nickname: $user.nickname,
				profile: {
					title: $user.nickname,
					name: $user.nickname,
					image: "/img/kkutu/guest.png"
				},
				exordial: $user.exordial || "",
				data: {
					score: ($user.kkutu && $user.kkutu.score) || 0,
					record: ($user.kkutu && $user.kkutu.record) || {}
				},
				equip: $user.equip || {},
				offline: true
			});
		});
	});
	Server.get("/user-id", function (req, res) {
		var nickname = (req.query.nickname || "").trim();

		if (!nickname) return res.json({ error: 400 });
		MainDB.users.findOne(['nickname', nickname]).limit(['nickname', true]).on(function ($user) {
			if (!$user) return res.json({ error: 405 });

			res.json({
				id: $user._id,
				nickname: $user.nickname
			});
		});
	});

	// POST
	Server.get("/profile-badge/:id", function (req, res) {
		getProfileBadges(req.params.id, function (error, badges) {
			if (error) return res.json({ error: 500 });
			res.json({ badges: badges });
		});
	});
	Server.post("/profile-badge/:id", function (req, res) {
		if (!req.session.profile || req.session.profile.guest) return res.json({ error: 400 });
		var uid = req.session.profile.id;
		var gid = req.params.id;

		getProfileBadges(uid, function (error, badges) {
			var list;

			if (error) return res.json({ error: 500 });
			list = badges.filter(function (b) { return b; });
			if (list.indexOf(gid) != -1) return save(list.filter(function (b) { return b != gid; }));
			MainDB.kkutu_shop.findOne(['_id', gid]).on(function ($item) {
				if (!$item || $item.group != "PBG") return res.json({ error: 430 });
				MainDB.users.findOne(['_id', uid]).limit(['box', true]).on(function ($user) {
					if (!$user || !hasItem($user, gid)) return res.json({ error: 430 });
					list.push(gid);
					save(list.slice(-3));
				});
			});
		});

		function save(list) {
			var badges = [list[0] || null, list[1] || null, list[2] || null];

			MainDB.users.direct("INSERT INTO profile_badge (user_id, badges) VALUES (" + PgEscape.literal(uid) + ", " + PgEscape.literal(JSON.stringify(badges)) + ") ON CONFLICT (user_id) DO UPDATE SET badges = EXCLUDED.badges", function (saveError) {
				if (saveError) return res.json({ error: 500 });
				res.json({ result: 200, badges: badges });
			}, true);
		}
	});
	Server.get("/nickname/setup", function (req, res) {
		if (!req.session.profile || req.session.profile.guest) return res.json({ required: false });

		MainDB.users.direct("SELECT 1 FROM nickname_setup WHERE user_id = " + PgEscape.literal(req.session.profile.id), function (error, $result) {
			if (error) return res.json({ required: false });
			res.json({ required: !$result.rowCount });
		}, true);
	});
	Server.post("/nickname/setup", function (req, res) {
		if (!req.session.profile || req.session.profile.guest) return res.json({ error: 400 });
		var uid = req.session.profile.id;
		var nickname = String(req.body.nickname || "").trim().slice(0, 16);
		var limit = GLOBAL.NICKNAME_LIMIT.REGEX;

		if (!nickname) return res.json({ error: 475 });
		if (new RegExp(limit[0], limit[1].replace("g", "")).test(nickname)) return res.json({ error: 474 });

		MainDB.users.direct("SELECT 1 FROM nickname_setup WHERE user_id = " + PgEscape.literal(uid), function (error, $result) {
			if (error) return res.json({ error: 500 });
			if ($result.rowCount) return res.json({ error: 473 });

			MainDB.users.findOne(['nickname', nickname]).on(function ($same) {
				if ($same && $same._id != uid) return res.json({ error: 456 });

				MainDB.users.update(['_id', uid]).set(['nickname', nickname]).on(function () {
					MainDB.users.direct("INSERT INTO nickname_setup (user_id) VALUES (" + PgEscape.literal(uid) + ") ON CONFLICT DO NOTHING", function (insertError) {
						if (insertError) return res.json({ error: 500 });
						req.session.profile = { ...req.session.profile, name: nickname, title: nickname, nickname };
						MainDB.session.update(['_id', req.sessionID]).set(['profile', req.session.profile]).on();
						res.json({ result: 200, nickname: nickname });
					}, true);
				});
			});
		}, true);
	});
	Server.post("/profile", function (req, res) {
		let nickname = req.body.nickname;
		const exordial = req.body.exordial;

		if (!req.session.profile) return res.send({ error: 400 });

		if (exordial !== undefined) MainDB.users.update(['_id', req.session.profile.id]).set(['exordial', exordial.slice(0, 100)]).on();
		if (!nickname) return res.send({ result: 200 });

		if (nickname.length > 16) nickname = nickname.slice(0, 16);
		MainDB.users.findOne(['nickname', nickname]).on(function (data) {
			if (data) return res.send({ error: 456 });
			MainDB.users.findOne(['_id', req.session.profile.id]).on(function (requester) {
				const now = Number(new Date());
				if (GLOBAL.NICKNAME_LIMIT.TERM > 0) {
					const changedDate = new Date(Number(requester.nickChanged));

					changedDate.setDate(changedDate.getDate() + GLOBAL.NICKNAME_LIMIT.TERM);
					if (now < Number(changedDate)) return res.send({ error: 457 });
				}

				MainDB.users.update(['_id', req.session.profile.id]).set(['nickname', nickname], ['nickChanged', now]).on();
				req.session.profile = { ...req.session.profile, name: nickname, title: nickname, nickname };
				MainDB.session.update(['_id', req.sessionID]).set(['profile', req.session.profile]).on();
				return res.send({ result: 200 });
			});
		});
	});
	Server.post("/buy/:id", function (req, res) {
		if (req.session.profile) {
			var uid = req.session.profile.id;
			var gid = req.params.id;

			MainDB.kkutu_shop.findOne(['_id', gid]).on(function ($item) {
				if (!$item) return res.json({ error: 400 });
				if ($item.cost < 0) return res.json({ error: 400 });
				MainDB.users.findOne(['_id', uid]).limit(['money', true], ['box', true]).on(function ($user) {
					if (!$user) return res.json({ error: 400 });
					if (!$user.box) $user.box = {};
					var postM = $user.money - $item.cost;

					if (postM < 0) return res.send({ result: 400 });

					obtain($user, gid, 1, $item.term);
					MainDB.users.update(['_id', uid]).set(
						['money', postM],
						['box', $user.box]
					).on(function ($fin) {
						res.send({ result: 200, money: postM, box: $user.box });
						JLog.log("[구매] " + gid + " by " + uid);
					});
					// HIT를 올리는 데에 동시성 문제가 발생한다. 조심하자.
					MainDB.kkutu_shop.update(['_id', gid]).set(['hit', $item.hit + 1]).on();
				});
			});
		} else res.json({ error: 423 });
	});
	Server.get("/enhance", function (req, res) {
		if (!req.session.profile) return res.json({ error: 400 });
		if (req.session.profile.guest) return res.json({ error: 421 });

		getEnhanceLevels(req.session.profile.id, function (error, levels) {
			if (error) return res.json({ error: 500 });
			res.json({
				levels: levels,
				max: Const.ENHANCE.MAX,
				bonus: Const.ENHANCE.BONUS,
				options: Const.ENHANCE.OPTIONS,
				rate: Const.ENHANCE.RATE,
				cost: Const.ENHANCE.COST,
				destroyLevel: Const.ENHANCE.DESTROY_LEVEL,
				destroy: Const.ENHANCE.DESTROY,
				refund: Const.ENHANCE.REFUND
			});
		});
	});
	Server.post("/enhance/:id", function (req, res) {
		if (!req.session.profile) return res.json({ error: 400 });
		if (req.session.profile.guest) return res.json({ error: 421 });
		var uid = req.session.profile.id;
		var gid = req.params.id;

		MainDB.kkutu_shop.findOne(['_id', gid]).on(function ($item) {
			if (!$item) return res.json({ error: 430 });
			if (!isEnhanceable($item.options)) return res.json({ error: 468 });

			MainDB.users.findOne(['_id', uid]).limit(['money', true], ['box', true], ['equip', true]).on(function ($user) {
				if (!$user) return res.json({ error: 400 });
				if (isEquipped($user, gid)) return res.json({ error: 470 });
				if (!hasItem($user, gid)) return res.json({ error: 430 });

				getEnhanceLevels(uid, function (error, levels) {
					var level = levels[gid] || 0;
					var cost, success, payQuery;

					if (error) return res.json({ error: 500 });
					if (level >= Const.ENHANCE.MAX) return res.json({ error: 469 });
					cost = Const.ENHANCE.COST[level];
					if (Number($user.money) < cost) return res.json({ error: 407 });
					success = Math.random() < Const.ENHANCE.RATE[level];
					payQuery = "UPDATE users SET money = money - " + cost + " WHERE _id = " + PgEscape.literal(uid) + " AND money >= " + cost + " RETURNING money";

					MainDB.users.direct(payQuery, function (payError, $paid) {
						var money;

						if (payError) return res.json({ error: 500 });
						if (!$paid.rowCount) return res.json({ error: 407 });
						money = Number($paid.rows[0].money);
						if (!success) {
							if (level >= Const.ENHANCE.DESTROY_LEVEL && Math.random() < Const.ENHANCE.DESTROY[level]) return destroyItem();
							JLog.log("[강화 실패] " + gid + " +" + level + " by " + uid);
							return res.json({ result: 200, success: false, level: level, money: money });
						}
						MainDB.users.direct("INSERT INTO item_enhance (user_id, item_id, level) VALUES (" + PgEscape.literal(uid) + ", " + PgEscape.literal(gid) + ", " + (level + 1) + ") ON CONFLICT (user_id, item_id) DO UPDATE SET level = EXCLUDED.level", function (enhanceError) {
							if (enhanceError) return res.json({ error: 500 });
							JLog.log("[강화 성공] " + gid + " +" + (level + 1) + " by " + uid);
							res.json({ result: 200, success: true, level: level + 1, money: money });
						}, true);
					}, true);

					function destroyItem() {
						var refund = Math.floor(Math.max(0, Number($item.cost) || 0) * Const.ENHANCE.REFUND);

						consume($user, gid, 1, true);
						MainDB.users.direct("UPDATE users SET money = money + " + refund + ", box = " + PgEscape.literal(JSON.stringify($user.box)) + "::json WHERE _id = " + PgEscape.literal(uid) + " RETURNING money", function (destroyError, $destroyed) {
							if (destroyError || !$destroyed.rowCount) return res.json({ error: 500 });
							MainDB.users.direct("DELETE FROM item_enhance WHERE user_id = " + PgEscape.literal(uid) + " AND item_id = " + PgEscape.literal(gid), function (resetError) {
								if (resetError) return res.json({ error: 500 });
								JLog.log("[강화 파괴] " + gid + " +" + level + " by " + uid + " (환급 " + refund + ")");
								res.json({ result: 200, success: false, destroyed: true, refund: refund, level: 0, money: Number($destroyed.rows[0].money), box: $user.box });
							}, true);
						}, true);
					}
				});
			});
		});
	});
	Server.post("/equip/:id", function (req, res) {
		if (!req.session.profile) return res.json({ error: 400 });
		var uid = req.session.profile.id;
		var gid = req.params.id;
		var isLeft = req.body.isLeft == "true";
		var now = Date.now() * 0.001;

		MainDB.users.findOne(['_id', uid]).limit(['box', true], ['equip', true]).on(function ($user) {
			if (!$user) return res.json({ error: 400 });
			if (!$user.box) $user.box = {};
			if (!$user.equip) $user.equip = {};
			var q = $user.box[gid], r;

			MainDB.kkutu_shop.findOne(['_id', gid]).limit(['group', true]).on(function ($item) {
				if (!$item) return res.json({ error: 430 });
				if (!Const.AVAIL_EQUIP.includes($item.group) && $item.group != "Mfront") return res.json({ error: 400 });

				var part = $item.group;
				if (part.substr(0, 3) == "BDG") part = "BDG";
				if (part == "Mhand") part = isLeft ? "Mlhand" : "Mrhand";
				var qid = $user.equip[part];

				if (qid) {
					r = $user.box[qid];
					if (r && r.expire) {
						obtain($user, qid, 1, r.expire, true);
					} else {
						obtain($user, qid, 1, now + $item.term, true);
					}
				}
				if (qid == $item._id) {
					delete $user.equip[part];
				} else {
					if (!q) return res.json({ error: 430 });
					consume($user, gid, 1);
					$user.equip[part] = $item._id;
				}
				MainDB.users.update(['_id', uid]).set(['box', $user.box], ['equip', $user.equip]).on(function ($res) {
					res.send({ result: 200, box: $user.box, equip: $user.equip });
				});
			});
		});
	});
	Server.post("/payback/:id", function (req, res) {
		if (!req.session.profile) return res.json({ error: 400 });
		var uid = req.session.profile.id;
		var gid = req.params.id;
		var isDyn = gid.charAt() == '$';

		MainDB.users.findOne(['_id', uid]).limit(['money', true], ['box', true]).on(function ($user) {
			if (!$user) return res.json({ error: 400 });
			if (!$user.box) $user.box = {};
			var q = $user.box[gid];

			if (!q) return res.json({ error: 430 });
			MainDB.kkutu_shop.findOne(['_id', isDyn ? gid.slice(0, 4) : gid]).limit(['cost', true]).on(function ($item) {
				if (!$item) return res.json({ error: 430 });

				consume($user, gid, 1, true);
				$user.money = Number($user.money) + Math.round(0.2 * Number($item.cost));
				MainDB.users.update(['_id', uid]).set(['money', $user.money], ['box', $user.box]).on(function ($res) {
					res.send({ result: 200, box: $user.box, money: $user.money });
				});
			});
		});
	});
	function blendWord(word) {
		var lang = parseLanguage(word);
		var i, kl = [];
		var kr = [];

		if (lang == "en") return String.fromCharCode(97 + Math.floor(Math.random() * 26));
		if (lang == "ko") {
			for (i = word.length - 1; i >= 0; i--) {
				var k = word.charCodeAt(i) - 0xAC00;

				kl.push([Math.floor(k / 28 / 21), Math.floor(k / 28) % 21, k % 28]);
			}
			[0, 1, 2].sort((a, b) => (Math.random() < 0.5)).forEach((v, i) => {
				kr.push(kl[v][i]);
			});
			return String.fromCharCode(((kr[0] * 21) + kr[1]) * 28 + kr[2] + 0xAC00);
		}
	}
	function parseLanguage(word) {
		return word.match(/[a-zA-Z]/) ? "en" : "ko";
	}
	Server.get("/cf-auto", function (req, res) {
		if (!req.session.profile) return res.json({ error: 400 });
		var uid = req.session.profile.id;
		var db = "p";

		MainDB.users.findOne(['_id', uid]).limit(['box', true]).on(function ($user) {
			if (!$user) return res.json({ error: 400 });
			var box = $user.box || {};
			var have = { ko: {}, en: {} };
			var jobs = [];
			var found = [];
			var left;
			var k, n, ch, lang, table;

			for (k in box) {
				if (!/^\$WP[ABC]/.test(k)) continue;
				n = typeof box[k] == "number" ? box[k] : ((box[k] && box[k].value) || 0);
				if (n <= 0) continue;
				ch = k.slice(4);
				if (ch == "☆") continue;
				lang = parseLanguage(ch);
				have[lang][ch] = (have[lang][ch] || 0) + n;
			}
			for (lang in have) {
				table = MainDB.kkutu[lang === "ko" && ["g", "p", "u"].indexOf(db) !== -1 ? lang + "_" + db : lang];
				if (table && Object.keys(have[lang]).length) jobs.push([table, have[lang]]);
			}
			if (!jobs.length) return res.json({ error: 471 });
			left = jobs.length;
			jobs.forEach(function (job) {
				findComposableWords(job[0], job[1], function (words) {
					found = found.concat(words);
					if (--left) return;
					if (!found.length) return res.json({ error: 471 });
					res.json({ word: found[Math.floor(Math.random() * found.length)] });
				});
			});
		});
	});
	function findComposableWords(table, have, callback) {
		var cls = Object.keys(have).map(function (c) { return c.replace(/[\\\]\[^-]/g, "\\$&"); }).join('');

		table.find(['_id', new RegExp("^[" + cls + "]{2,6}$")]).limit(5000).on(function ($docs) {
			callback(($docs || []).map(function (doc) { return doc._id; }).filter(function (word) {
				var used = {};
				var i;

				for (i = 0; i < word.length; i++) {
					used[word[i]] = (used[word[i]] || 0) + 1;
					if (used[word[i]] > have[word[i]]) return false;
				}
				return true;
			}));
		});
	}
	Server.post("/cf", function (req, res) {
		if (!req.session.profile) return res.json({ error: 400 });
		var uid = req.session.profile.id;
		var tray = (req.body.tray || "").split('|');
		var db = "p";
		var i, o;

		if (tray.length < 1 || tray.length > 6) return res.json({ error: 400 });
		MainDB.users.findOne(['_id', uid]).limit(['money', true], ['box', true]).on(function ($user) {
			if (!$user) return res.json({ error: 400 });
			if (!$user.box) $user.box = {};
			var req = {}, word = "", level = 0;
			var cfr, gain = [];
			var blend;

			for (i in tray) {
				word += tray[i].slice(4);
				level += 68 - tray[i].charCodeAt(3);
				req[tray[i]] = (req[tray[i]] || 0) + 1;
				if (($user.box[tray[i]] || 0) < req[tray[i]]) return res.json({ error: 434 });
			}
			if ((word.match(/☆/g) || []).length > 1) return res.json({ error: 472 });
			var plain = word.replace(/☆/g, "");
			if (!plain) return res.json({ error: 404 });
			var lang = parseLanguage(plain);
			var DB = MainDB.kkutu[lang === "ko" && ["g", "p", "u"].indexOf(db) !== -1 ? lang + "_" + db : lang];

			if (!DB) return res.json({ error: 400 });
			DB.findOne(['_id', plain]).on(function ($dic) {
				if (!$dic) {
					if (plain.length == 3 && plain == word) {
						blend = true;
					} else return res.json({ error: 404 });
				}
				cfr = getCFRewards(word, level, blend);
				if ($user.money < cfr.cost) return res.json({ error: 407 });
				for (i in req) consume($user, i, req[i]);
				for (i in cfr.data) {
					o = cfr.data[i];

					if (Math.random() >= o.rate) continue;
					if (o.key.charAt(4) == "?") {
						o.key = o.key.slice(0, 4) + (blend ? blendWord(plain) : plain.charAt(Math.floor(Math.random() * plain.length)));
					}
					obtain($user, o.key, o.value, o.term);
					gain.push(o);
				}
				$user.money -= cfr.cost;
				MainDB.users.update(['_id', uid]).set(['money', $user.money], ['box', $user.box]).on(function ($res) {
					res.send({ result: 200, box: $user.box, money: $user.money, gain: gain });
				});
			});
		});
		// res.send(getCFRewards(req.params.word, Number(req.query.l || 0)));
	});
	Server.get("/dict/:word", function (req, res) {
		var word = req.params.word;
		var lang = req.query.lang;
		var db = req.query.db || "p";
		var DB = MainDB.kkutu[lang === "ko" && ["g", "p", "u"].indexOf(db) !== -1 ? lang + "_" + db : lang];

		if (!DB) return res.send({ error: 400 });
		if (!DB.findOne) return res.send({ error: 400 });
		DB.findOne(['_id', word]).on(function ($word) {
			if (!$word) return res.send({ error: 404 });
			res.send({
				word: $word._id,
				mean: $word.mean,
				theme: $word.theme,
				type: $word.type
			});
		});
	});

};
function getCFRewards(word, level, blend) {
	var R = [];
	var f = {
		len: word.length, // 최대 6
		lev: level // 최대 18
	};
	var cost = 20 * f.lev;
	var wur = f.len / 36; // 최대 2.867

	if (blend) {
		if (wur >= 0.5) {
			R.push({ key: "$WPA?", value: 1, rate: 1 });
		} else if (wur >= 0.35) {
			R.push({ key: "$WPB?", value: 1, rate: 1 });
		} else if (wur >= 0.05) {
			R.push({ key: "$WPC?", value: 1, rate: 1 });
		}
		cost = Math.round(cost * 0.2);
	} else {
		R.push({ key: "dictPage", value: Math.round(f.len * 0.6), rate: 1 });
		R.push({ key: "boxB4", value: 1, rate: Math.min(1, f.lev / 7) });
		if (f.lev >= 5) {
			R.push({ key: "boxB3", value: 1, rate: Math.min(1, f.lev / 15) });
			cost += 10 * f.lev;
			wur += f.lev / 20;
		}
		if (f.lev >= 10) {
			R.push({ key: "boxB2", value: 1, rate: Math.min(1, f.lev / 30) });
			cost += 20 * f.lev;
			wur += f.lev / 10;
		}
		if (wur >= 0.05) {
			if (wur > 1) R.push({ key: "$WPC?", value: Math.floor(wur), rate: 1 });
			R.push({ key: "$WPC?", value: 1, rate: wur % 1 });
		}
		if (wur >= 0.35) {
			if (wur > 2) R.push({ key: "$WPB?", value: Math.floor(wur / 2), rate: 1 });
			R.push({ key: "$WPB?", value: 1, rate: (wur / 2) % 1 });
		}
		if (wur >= 0.5) {
			R.push({ key: "$WPA?", value: 1, rate: wur / 3 });
		}
		if (f.len >= 4) R.push({ key: CF_STAR, value: 1, rate: CF_STAR_RATE });
	}
	return { data: R, cost: cost };
}