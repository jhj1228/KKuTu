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

// 언어 파일 로드
var Language = {
    'ko_KR': require("../lang/ko_KR.json"),
};

exports.run = function (Server, page) {
    Server.get("/wordsearch", function (req, res) {
        page(req, res, "wordsearch", {
            'KO_THEME': Const.KO_THEME,
            'KO_INJEONG': Const.KO_INJEONG
        });
    });

    Server.get("/api/wordsearch/:theme", function (req, res) {
        var theme = req.params.theme;
        var limit = Number(req.query.limit) || 100;
        var offset = Number(req.query.offset) || 0;

        if (!theme) {
            return res.send({ error: 400, message: "주제를 찾을 수 없습니다." });
        }

        MainDB.kkutu['ko'].find()
            .on(function ($body) {
                if (!$body || $body.length === 0) {
                    return res.send({ error: 404, message: "해당 주제에 단어가 없습니다.", words: [] });
                }

                var filteredWords = $body.filter(function (word) {
                    if (!word.theme) return false;

                    var themes = word.theme.toString().split(',').map(function (t) {
                        return t.trim();
                    });
                    return themes.indexOf(theme) !== -1;
                });

                if (filteredWords.length === 0) {
                    return res.send({ error: 404, message: "해당 주제에 단어가 없습니다.", words: [] });
                }

                var words = filteredWords.slice(offset, offset + limit).map(function (word) {
                    return {
                        word: word._id,
                        mean: word.mean || "",
                        type: word.type || "",
                        hit: word.hit || 0,
                        flag: word.flag || 0
                    };
                });

                res.send({ error: 0, words: words, total: filteredWords.length });
            });
    });

    Server.get("/api/wordsearch/themes/list", function (req, res) {
        var langData = Language['ko_KR']['kkutu'];
        var themeList = [];

        var koThemeList = Const.KO_THEME.map(function (themeCode) {
            var themeName = langData['theme_' + themeCode];
            return {
                code: themeCode,
                name: themeName || themeCode
            };
        });
        koThemeList.sort(function (a, b) {
            return a.name.localeCompare(b.name, 'ko');
        });
        themeList = themeList.concat(koThemeList);

        var koInjeongList = Const.KO_INJEONG.map(function (themeCode) {
            var themeName = langData['theme_' + themeCode];
            return {
                code: themeCode,
                name: themeName || themeCode
            };
        });
        koInjeongList.sort(function (a, b) {
            return a.name.localeCompare(b.name, 'ko');
        });
        themeList = themeList.concat(koInjeongList);

        res.send({
            error: 0,
            themes: themeList,
            total: themeList.length
        });
    });

    Server.get("/api/wordsearch/:theme/download", function (req, res) {
        var theme = req.params.theme;

        if (!theme) {
            return res.send({ error: 400, message: "주제를 찾을 수 없습니다." });
        }

        MainDB.kkutu['ko'].find()
            .on(function ($body) {
                if (!$body || $body.length === 0) {
                    return res.send({ error: 404, message: "해당 주제에 단어가 없습니다." });
                }

                var filteredWords = $body.filter(function (word) {
                    if (!word.theme) return false;

                    var themes = word.theme.toString().split(',').map(function (t) {
                        return t.trim();
                    });
                    return themes.indexOf(theme) !== -1;
                });

                if (filteredWords.length === 0) {
                    return res.send({ error: 404, message: "해당 주제에 단어가 없습니다." });
                }

                var sortedWords = filteredWords.sort(function (a, b) {
                    return a._id.localeCompare(b._id, 'ko');
                });

                var content = sortedWords.map(function (word) {
                    return word._id;
                }).join('\n');

                var langData = Language['ko_KR']['kkutu'];
                var themeName = langData['theme_' + theme] || theme;
                var filename = encodeURI(themeName + '.txt');

                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
                res.send(content);
            });
    });
};
