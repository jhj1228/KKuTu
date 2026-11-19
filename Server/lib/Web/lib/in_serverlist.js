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
	var REFRESH_INTERVAL = 60000;
	var LIST = [];
	var RAW = {};
	var ADMIN = false;
	var $stage;

	$(document).ready(function () {
		ADMIN = $("#sl-wrap").attr('data-admin') === "1";
		$stage = {
			rows: $("#sl-rows"),
			total: $("#sl-total"),
			updated: $("#sl-updated"),
			ref: $("#sl-refresh"),
			refi: $("#sl-refresh>i"),
			diag: $("#sl-dialog"),
			form: $("#sl-form")
		};

		$stage.ref.on('click', function () {
			if ($stage.refi.hasClass("fa-spin")) return;
			load();
		});
		$("#sl-random").on('click', function () {
			var pool = LIST.filter(function (v) {
				return v && v.alive && v.enter && v.online < v.capacity;
			});

			if (!pool.length) return alert("지금 접속할 수 있는 서버가 없습니다.");
			location.href = pool[Math.floor(Math.random() * pool.length)].enter;
		});
		if (ADMIN) initAdmin();
		load();
		setInterval(load, REFRESH_INTERVAL);
	});

	function load() {
		$stage.refi.addClass("fa-spin");
		$.ajax({ url: "/serverlist/data", dataType: "json", cache: false })
			.done(render)
			.fail(function () {
				$stage.updated.text("서버 목록을 불러오지 못했습니다.");
			})
			.always(function () {
				setTimeout(function () { $stage.refi.removeClass("fa-spin"); }, 600);
			});
	}
	function safeURL(url) {
		url = String(url || "");
		return /^(https?:\/\/|\/)/i.test(url) ? url : "";
	}
	function num(n) {
		return Number(n || 0).toLocaleString("en-US");
	}
	function linkCell(cls, url, text) {
		var $td = $("<td>").addClass(cls);
		var href = safeURL(url);

		if (href) $td.append($("<a>").attr({ href: href, target: "_blank", rel: "noopener" }).text(text));
		else $td.text("-");
		return $td;
	}
	function render(data) {
		var sum = 0;

		LIST = (data && data.list) || [];
		RAW = {};
		((data && data.raw) || []).forEach(function (r) { RAW[r.id] = r; });
		$stage.rows.empty();
		if (!LIST.length) {
			$stage.rows.append($("<tr>").addClass("sl-empty")
				.append($("<td>").attr('colspan', ADMIN ? 7 : 6).text("등록된 서버가 없습니다.")));
		}
		LIST.forEach(function (v, i) {
			if (!v) return;
			var rate = v.capacity ? Math.min(100, v.online / v.capacity * 100) : 0;
			var home = safeURL(v.homepage);
			var status = !v.alive ? "x" : (v.ping >= 500 ? "p" : "o");
			var $home = home ? $("<a>").attr({ href: home, target: "_blank", rel: "noopener" }) : $("<label>");
			var $tr;

			if (v.alive) sum += v.online;
			$home.append($("<img>").attr({ src: safeURL(v.icon) || "/img/kkutu/logo.png", alt: "" }))
				.append($("<label>").text(String(v.homepage || "-").replace(/\/+$/, "")));

			$stage.rows.append($tr = $("<tr>").toggleClass("sl-offline", !v.alive)
				.append($("<td>").addClass("sl-home").append($home))
				.append($("<td>").addClass("sl-name").text(v.name || "-"))
				.append($("<td>").addClass("sl-people").append($("<div>").addClass("graph")
					.append($("<div>").addClass("graph-bar").toggleClass("sl-full", rate >= 99).width(rate + "%"))
					.append($("<label>").text(v.alive ? (num(v.online) + " / " + num(v.capacity)) : "-"))
				))
				.append($("<td>").addClass("sl-ping")
					.append($("<div>").addClass("sl-status ss-" + status))
					.append(document.createTextNode(v.alive ? (v.ping + "ms") : "오프라인"))
				)
				.append(linkCell("sl-repo", v.repository, "방문"))
				.append(linkCell("sl-enter", v.alive ? v.enter : "", "접속"))
			);
			if (ADMIN) $tr.append($("<td>").addClass("sl-admin")
				.append(adminBtn("arrow-up", "위로", i === 0, function () { move(v.id, "up"); }))
				.append(adminBtn("arrow-down", "아래로", i === LIST.length - 1, function () { move(v.id, "down"); }))
				.append(adminBtn("pencil", "수정", false, function () { openForm(RAW[v.id]); }))
				.append(adminBtn("trash", "삭제", false, function () { remove(v); }))
			);
		});
		$stage.total.html("&nbsp;(총 " + num(sum) + "명)");
		$stage.updated.text("업데이트 일시: " + (data && data.updatedAt ? new Date(data.updatedAt).toLocaleString("ko-KR") : "-"));
	}
	function adminBtn(icon, title, disabled, onClick) {
		return $("<button>").attr({ type: "button", title: title })
			.prop('disabled', disabled)
			.append($("<i>").addClass("fa fa-" + icon))
			.on('click', onClick);
	}
	function initAdmin() {
		$("#sl-register").on('click', function () { openForm(null); });
		$stage.diag.find(".closeBtn").on('click', closeForm);
		$("#sl-form-cancel").on('click', closeForm);
		$stage.form.on('submit', function (e) {
			e.preventDefault();
			var data = {};

			$stage.form.serializeArray().forEach(function (f) { data[f.name] = f.value; });
			if (!data.self) data.self = "false";
			post("/serverlist/admin/save", data, closeForm);
		});
	}
	function openForm(raw) {
		var r = raw || {};
		var $w = $(window);

		$stage.diag.find(".dialog-title").text(raw ? "서버 수정" : "서버 등록");
		$("#sl-form-error").text("");
		["id", "name", "homepage", "api", "enter", "repository", "icon"].forEach(function (k) {
			$stage.form.find("[name='" + k + "']").val(r[k] || "");
		});
		$("#sl-form-self").prop('checked', !!r.self);
		$stage.diag.show().css({
			left: Math.max(0, ($w.width() - $stage.diag.outerWidth()) / 2),
			top: Math.max(40, ($w.height() - $stage.diag.outerHeight()) / 2)
		});
		$stage.form.find("[name='name']").trigger('focus');
	}
	function closeForm() {
		$stage.diag.hide();
	}
	function move(id, dir) {
		post("/serverlist/admin/move", { id: id, dir: dir });
	}
	function remove(v) {
		if (!confirm("'" + v.name + "' 서버를 목록에서 삭제할까요?")) return;
		post("/serverlist/admin/delete", { id: v.id });
	}
	function post(url, data, onSuccess) {
		var $submit = $stage.form.find("[type='submit']").prop('disabled', true);

		$.ajax({ url: url, method: "POST", data: data, dataType: "json" })
			.done(function () {
				if (onSuccess) onSuccess();
				load();
			})
			.fail(function (xhr) {
				var msg = (xhr.responseJSON && xhr.responseJSON.error) || "요청을 처리하지 못했습니다.";

				if ($stage.diag.is(":visible")) $("#sl-form-error").text(msg);
				else alert(msg);
			})
			.always(function () { $submit.prop('disabled', false); });
	}
})();
