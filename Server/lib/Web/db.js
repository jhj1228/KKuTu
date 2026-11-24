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

const LANG = ["ko", "en"];

var PgPool = require("pg").Pool;
var GLOBAL = require("../sub/global.json");
var JLog = require("../sub/jjlog");
var Collection = require("../sub/collection");
var Pub = require("../sub/checkpub");
var Lizard = require("../sub/lizard");
var PgEscape = require("pg-escape");

const RANKED_SQL = "SELECT _id AS id, (kkutu->>'score')::numeric AS score, " +
	"ROW_NUMBER() OVER (ORDER BY (kkutu->>'score')::numeric DESC, _id) - 1 AS rank " +
	"FROM users WHERE kkutu IS NOT NULL AND kkutu->>'score' ~ '^[0-9]+(\\.[0-9]+)?$'";
exports.RANKED_SQL = RANKED_SQL;

function createRanking(table) {
	return {
		getSurround: function (id, rv) {
			var R = new Lizard.Tail();

			rv = rv || 8;
			table.direct("WITH ranked AS (" + RANKED_SQL + "), t AS (SELECT rank FROM ranked WHERE id = " + PgEscape.literal(id) + ") " +
				"SELECT ranked.id, ranked.score, ranked.rank FROM ranked, t " +
				"WHERE ranked.rank >= GREATEST(0, t.rank - " + Math.round(rv / 2 + 1) + ") ORDER BY ranked.rank LIMIT " + Number(rv),
				function (err, res) {
					if (err) {
						JLog.error("랭킹 조회 오류: " + err.toString());
						return R.go({ target: id, data: [] });
					}
					R.go({
						target: id,
						data: res.rows.map(function (item) {
							return { id: item.id, rank: Number(item.rank), score: Number(item.score) };
						})
					});
				}, true);
			return R;
		}
	};
}

Pub.ready = function (isPub) {
	var Pg = new PgPool({
		user: GLOBAL.PG_USER,
		password: GLOBAL.PG_PASSWORD,
		port: GLOBAL.PG_PORT,
		database: GLOBAL.PG_DATABASE,
		host: GLOBAL.PG_HOST
	});
	connectPg();
	function connectPg() {
		Pg.connect(function (err, pgMain) {
			if (err) {
				JLog.error("PostgreSQL 서버 연결 오류: " + err.toString());
				return;
			}
			var mainAgent = new Collection.Agent("Postgres", pgMain);

			var DB = exports;
			var i;

			DB.kkutu = {};
			DB.kkutu_cw = {};
			DB.kkutu_manner = {};

			for (i in LANG) {
				DB.kkutu[LANG[i]] = new mainAgent.Table("kkutu_" + LANG[i]);
				DB.kkutu_cw[LANG[i]] = new mainAgent.Table("kkutu_cw_" + LANG[i]);
				DB.kkutu_manner[LANG[i]] = new mainAgent.Table("kkutu_manner_" + LANG[i]);
			}
			DB.kkutu.ko_g = new mainAgent.Table("kkutu_ko_g");
			DB.kkutu.ko_p = new mainAgent.Table("kkutu_ko_p");
			DB.kkutu.ko_u = new mainAgent.Table("kkutu_ko_u");
			DB.kkutu_injeong = new mainAgent.Table("kkutu_injeong");
			DB.kkutu_shop = new mainAgent.Table("kkutu_shop");
			DB.kkutu_shop_desc = new mainAgent.Table("kkutu_shop_desc");
			DB.kkutu_shop_desc.refreshLanguage = function (Language) {
				this.find().on(function ($docs) {
					var lang, i;

					for (lang in Language) {
						var db;

						Language[lang].SHOP = db = {};
						for (i in $docs)
							db[$docs[i]._id] = [$docs[i][`name_${lang}`], $docs[i][`desc_${lang}`]];
					}
				});
			};

			DB.session = new mainAgent.Table("session");
			DB.users = new mainAgent.Table("users");
			DB.ranking = createRanking(DB.users);
			/* Enhanced User Block System [S] */
			DB.ip_block = new mainAgent.Table("ip_block");
			/* Enhanced User Block System [E] */

			if (exports.ready) exports.ready(null, Pg);
			else JLog.warn("DB.onReady가 아직 정의되지 않았습니다.");
		});
	}
};