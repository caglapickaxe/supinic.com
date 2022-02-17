module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const columns = {
		all: ["Author", "Text", "Status", "Priority", "Update", "ID"],
		active: ["ID", "Text", "Status", "Priority", "Update"],
		resolved: ["ID", "Text", "Status", "Priority", "Update"],
		clientside:  ["Author", "Text", "Status", "Update", "ID"]
	};

	const redirect = async (req, res, urlCallback) => {
		const auth = await sb.WebUtils.getUserLevel(req, res);
		if (auth.error) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "Your session timed out, please log in again"
			});
		}
		else if (!sb.WebUtils.compareLevels(auth.level, "login")) {
			return res.status(401).render("error", {
				error: "401 Unauthorized",
				message: "You must be logged in before viewing your suggestion statistics"
			});
		}

		const name = encodeURIComponent(auth.userData.Name);
		res.redirect(urlCallback(name));
	};

	Router.get("/list", async (req, res) => {
		res.render("generic-ajax-list-table", {
			head: columns.clientside,
			url: "https://supinic.com/api/data/suggestion/list/client",
			sortDirection: "desc",
			sortColumn: 4,
			pageLength: 25,
			specificFiltering: true,
			extraScript: `
				globalThis.prepareData = (i) => {
					i.Update = (i.Update) ? utils.timeDelta(i.Update) : "N/A";
					return i;
				};
			`
		});
	});

	Router.get("/list/active", async (req, res) => {
		res.render("generic-ajax-list-table", {
			head: columns.clientside,
			url: "https://supinic.com/api/data/suggestion/list/active/client",
			sortDirection: "desc",
			sortColumn: 4,
			pageLength: 25,
			specificFiltering: true,
			extraScript: `
				globalThis.prepareData = (i) => {
					i.Update = (i.Update) ? utils.timeDelta(i.Update) : "N/A";
					return i;
				};
			`
		});
	});

	Router.get("/list/resolved", async (req, res) => {
		res.render("generic-ajax-list-table", {
			head: columns.clientside,
			url: "https://supinic.com/api/data/suggestion/list/resolved/client",
			sortDirection: "desc",
			sortColumn: 4,
			pageLength: 25,
			specificFiltering: true,
			extraScript: `
				globalThis.prepareData = (i) => {
					i.Update = (i.Update) ? utils.timeDelta(i.Update) : "N/A";
					return i;
				};
			`
		});
	});

	// --- miscellaneous endpoints ---

	Router.get("/stats", async (req, res) => {
		const { data } = await sb.Got("Supinic", "/data/suggestion/stats").json();
		const printData = data
			.filter(i => i.total >= 10)
			.map(i => ({
				User: i.userName,
				Total: {
					dataOrder: i.total,
					value: sb.Utils.groupDigits(i.total)
				},
				Accepted: {
					dataOrder: i.accepted,
					value: sb.Utils.groupDigits(i.accepted)
				},
				Refused: {
					dataOrder: i.refused,
					value: sb.Utils.groupDigits(i.refused)
				}
			}));

		res.render("generic-list-table", {
			data: printData,
			sortColumn: 1,
			sortDirection: "desc",
			head: ["User", "Total", "Accepted", "Refused"],
			pageLength: 25
		});
	});

	Router.get("/user/list/active", async (req, res) => {
		await redirect(req, res, name => `/data/suggestion/list/active?userName=${name}`);
	});

	Router.get("/user/list/resolved", async (req, res) => {
		await redirect(req, res, name => `/data/suggestion/list/resolved?userName=${name}`);
	});

	Router.get("/user/stats", async (req, res) => {
		await redirect(req, res, name => `/data/suggestion/stats/user/${name}`);
	});

	Router.get("/stats/user/:user", async (req, res) => {
		const escaped = encodeURIComponent(req.params.user);
		const { statusCode, body } = await sb.Got("Supinic", `/data/suggestion/stats/user/${escaped}`);
		if (statusCode !== 200) {
			return res.status(statusCode).render("error", {
				error: sb.WebUtils.formatErrorMessage(statusCode),
				message: body.error.message
			});
		}

		const printData = body.data.statuses.map(i => {
			const percentTotal = sb.Utils.round(i.userAmount / body.data.globalTotal * 100, 2);
			const percentUser = sb.Utils.round(i.userAmount / body.data.userTotal * 100, 2);

			return {
				Status: i.status ?? "Pending review",
				Count: i.userAmount,
				"% of all": {
					dataOrder: percentTotal,
					value: `${percentTotal}%`
				},
				"% of user": {
					dataOrder: percentUser,
					value: `${percentUser}%`
				}
			};
		});

		res.render("generic-list-table", {
			data: printData,
			head: ["Status", "Count", "% of all", "% of user"],
			pageLength: 25
		});
	});

	Router.get("/:id", async (req, res) => {
		const suggestionID = Number(req.params.id);
		if (!sb.Utils.isValidInteger(suggestionID)) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Invalid suggestion ID"
			});
		}

		const { data } = await sb.Got("Supinic", `data/suggestion/${suggestionID}`).json();
		if (!data) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "Suggestion does not exist"
			});
		}

		let priorityString = String(data.priority);
		if (data.category === "Void") {
			priorityString = "N/A";
		}
		else if (!data.category || data.priority === 255 || data.priority === null) {
			priorityString = "(pending review)";
		}

		const renderData = {
			ID: data.ID,
			"Created by": data.username,
			"Created on": new sb.Date(data.date).format("Y-m-d H:i:s"),
			Category: data.category ?? "(pending review)",
			Status: data.status ?? "(pending review)",
			Priority: priorityString,
			Text: (data.text)
				? sb.Utils.escapeHTML(data.text)
				: "N/A",
			Notes: data.notes ?? "N/A",
			"Last update": (data.lastUpdate)
				? new sb.Date(data.lastUpdate).format("Y-m-d H:i:s")
				: "N/A"
		};

		if (data.githubLink) {
			renderData["GitHub reference"] = `<a target="_blank" href="//${data.githubLink}">Link</a>`;
		}

		res.render("generic-detail-table", {
			data: renderData,
			openGraphDefinition: [
				{
					property: "title",
					content: `Suggestion ID ${data.ID} from ${data.username} (${data.status ?? "pending"})`
				},
				{
					property: "description",
					content: (data.text)
						? sb.Utils.wrapString(data.text, 300)
						: "(no description available)"
				},
				{
					property: "url",
					content: `https://supinic.com/data/suggestion/${data.ID}`
				}
			]
		});
	});

	return Router;
})();
