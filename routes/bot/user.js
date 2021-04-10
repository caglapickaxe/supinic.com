module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const prettifyAliasData = (aliases) => aliases.map(alias => {
		const created = (alias.created) ? new sb.Date(alias.created) : null;
		return {
			Name: (alias.name)
				? `<div class="hoverable" title="${alias.description}">${alias.name}</div>`
				: alias.name,
			Invocation: alias.invocation.join(" "),
			Created: {
				dataOrder: created ?? 0,
				value: (created) ? created.format("Y-m-d") : "N/A"
			}
		};
	});

	Router.get("/alias/find", async (req, res) => {
		res.render("generic-form", {
			prepend: sb.Utils.tag.trim `
				<h5 class="pt-3 text-center">Search for another user's aliases</h5>
	            <div id="alert-anchor"></div>
			`,
			onSubmit: "submit()",
			fields: [
				{
					id: "user-name",
					name: "User name",
					type: "string"
				}
			],
			script: sb.Utils.tag.trim`
				async function submit (element) {
					const userName = encodeURIComponent(document.getElementById("user-name").value).toLowerCase();
					const alerter = document.getElementById("alert-anchor");
						
					const response = await fetch("/api/bot/user/resolve/name/" + userName);
					const { data } = await response.json();
					if (data) {					
						location.href = "/bot/user/" + userName + "/alias/list";
					}
					else {
						alerter.classList.add("alert");
						alerter.classList.add("alert-danger");
						alerter.innerHTML = "User was not found!";
					}
				}
			`
		});
	});

	Router.get("/:username/alias/list", async (req, res) => {
		const { username } = req.params;
		const { statusCode, body } = await sb.Got("Supinic", {
			url: "bot/user/" + encodeURIComponent(username) + "/alias/list",
			throwHttpErrors: false
		});

		if (statusCode !== 200) {
			return res.status(404).render("error", {
				error: statusCode,
				message: body.error.message
			});
		}

		const printData = prettifyAliasData(body.data.aliases);
		res.render("generic-list-table", {
			data: printData,
			head: ["Name", "Invocation", "Created"],
			pageLength: 25,
			sortColumn: 0,
			sortDirection: "asc",
			specificFiltering: true,
			extraCSS: `
				div.hoverable {
					cursor: pointer;
					text-decoration: underline dotted;
				}
			`
		});
	});

	return Router;
})();