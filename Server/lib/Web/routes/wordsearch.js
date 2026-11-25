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

var MainDB = require("../db");
var Const = require("../../const");
var JLog = require("../../sub/jjlog");
var PgEscape = require("pg-escape");

var LANG = require("../lang/ko_KR.json")['kkutu'];

var MAX_LIMIT = 1000;

function getThemeName(code) {
    return LANG['theme_' + code] || code;
}
function getThemeList(codes) {
    return codes.map(function (code) {
        return { code: code, name: getThemeName(code) };
    }).sort(function (a, b) {
        return a.name.localeCompare(b.name, 'ko');
    });
}
function isTheme(code) {
    return Const.KO_THEME.includes(code) || Const.KO_INJEONG.includes(code);
}
function findWords(theme, columns, tail, callback) {
    MainDB.kkutu['ko_p'].direct("SELECT " + columns + " FROM kkutu_ko_p WHERE theme ~ " + PgEscape.literal("(,|^)" + theme + "(,|$)") + tail, function (error, $result) {
        if (error) JLog.error("단어장 조회 오류: " + error.toString());
        callback(error, $result && $result.rows);
    }, true);
}
function toInteger(value, fallback, min, max) {
    value = Math.floor(Number(value));
    if (!isFinite(value)) value = fallback;
    return Math.min(max, Math.max(min, value));
}

exports.run = function (Server, page) {
    Server.get("/wordsearch", function (req, res) {
        page(req, res, "wordsearch", { 'bg': "gamebg.png" });
    });

    Server.get("/api/wordsearch/themes/list", function (req, res) {
        var themes = getThemeList(Const.KO_THEME).concat(getThemeList(Const.KO_INJEONG));

        res.send({ error: 0, themes: themes, total: themes.length });
    });

    Server.get("/api/wordsearch/:theme", function (req, res) {
        var theme = req.params.theme;
        var limit = toInteger(req.query.limit || 100, 100, 1, MAX_LIMIT);
        var offset = toInteger(req.query.offset || 0, 0, 0, 1000000);

        if (!isTheme(theme)) return res.send({ error: 400, message: "주제를 찾을 수 없습니다." });
        findWords(theme, "COUNT(*) AS total", "", function (countError, $count) {
            if (countError) return res.send({ error: 500, message: "단어를 불러오지 못했습니다." });

            findWords(theme, "_id", ' ORDER BY _id COLLATE "C" LIMIT ' + limit + " OFFSET " + offset, function (error, $words) {
                if (error) return res.send({ error: 500, message: "단어를 불러오지 못했습니다." });

                res.send({
                    error: 0,
                    total: Number($count[0].total),
                    words: $words.map(function (item) { return item._id; })
                });
            });
        });
    });

    Server.get("/api/wordsearch/:theme/download", function (req, res) {
        var theme = req.params.theme;

        if (!isTheme(theme)) return res.status(404).send("주제를 찾을 수 없습니다.");
        findWords(theme, "_id", ' ORDER BY _id COLLATE "C"', function (error, $words) {
            if (error) return res.status(500).send("단어를 불러오지 못했습니다.");

            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(getThemeName(theme) + ".txt"));
            res.send($words.map(function (item) { return item._id; }).join('\n'));
        });
    });
};
