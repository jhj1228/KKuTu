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

(function () {
	var PAGE_SIZE = 500;
	var $stage;
	var theme = "";
	var request = null;
	var loaded = 0;
	var total = 0;
	var $list;

	$(document).ready(function () {
		$stage = {
			theme: $("#themeSelect"),
			search: $("#searchBtn"),
			loading: $("#loadingSpinner"),
			result: $("#wordList"),
			count: $("#wordCount"),
			download: $("#downloadBtn")
		};

		$stage.search.on('click', search);
		$stage.theme.on('change', reset);
		$stage.download.on('click', function () {
			location.href = "/api/wordsearch/" + encodeURIComponent(theme) + "/download";
		});
		loadThemes();
	});

	function loadThemes() {
		$.ajax({ url: "/api/wordsearch/themes/list", dataType: "json" })
			.done(function (res) {
				var selected = $stage.theme.val();

				$stage.theme.children("option").slice(1).remove();
				res.themes.forEach(function (item) {
					$stage.theme.append($("<option>").val(item.code).text(item.name));
				});
				$stage.theme.val(selected || "");
			})
			.fail(function () {
				showError("주제 목록을 불러오지 못했습니다.");
			});
	}
	function reset() {
		if (request) request.abort();
		request = null;
		theme = "";
		loaded = total = 0;
		$list = null;
		$stage.loading.addClass("hidden");
		$stage.result.empty();
		$stage.count.empty();
		$stage.download.hide();
	}
	function search() {
		reset();
		theme = $stage.theme.val();
		if (!theme) return showError("주제를 선택하세요.");
		$stage.loading.removeClass("hidden");
		loadWords();
	}
	function loadWords() {
		if (request) return;
		request = $.ajax({
			url: "/api/wordsearch/" + encodeURIComponent(theme),
			data: { limit: PAGE_SIZE, offset: loaded },
			dataType: "json"
		});
		request.done(function (res) {
			request = null;
			$stage.loading.addClass("hidden");
			if (res.error) return showError(res.message);
			if (!loaded) {
				total = res.total;
				if (!total) return $stage.result.append($("<div>").addClass("word-message").text("해당 주제에 단어가 없습니다."));
				drawFrame();
			}
			loaded += res.words.length;
			if (!res.words.length) loaded = total;
			$list.append(res.words.map(function (word) {
				return $("<div>").addClass("word-item ellipse").attr('title', word).text(word)[0];
			}));
			onScroll();
		}).fail(function (xhr, status) {
			if (status === "abort") return;
			request = null;
			$stage.loading.addClass("hidden");
			showError("단어를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
		});
	}
	function drawFrame() {
		$stage.count.text(" - " + $stage.theme.children(":selected").text() + " [" + total.toLocaleString("en-US") + "개]");
		$stage.result.append($list = $("<div>").addClass("word-list").on('scroll', onScroll));
		$stage.download.show();
	}
	function onScroll() {
		var el = $list[0];

		if (loaded < total && el.scrollHeight - el.scrollTop - el.clientHeight < 300) loadWords();
	}
	function showError(message) {
		$stage.result.children(".word-error").remove();
		$stage.result.append($("<div>").addClass("word-message word-error").text(message));
	}
})();
