module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const Status = require("../../modules/wow/status.js");

	Router.get("/aq-effort/:server", async (req, res) => {
		const { server } = req.params;
		const data = await Status.getAllLatest(server);
		if (data.length === 0) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "No data found for given server"
			});
		}

		const printData = data.map(i => {
			const percent = sb.Utils.round(i.Current / i.Required * 100, 2);
			const normal = i.Material.toLowerCase().replace(/ /g, "_");

			return {
				Material: `<a href="/wow/aq-effort/${server}/material/${i.Faction}/${normal}">${i.Material}</a>`,
				Faction: i.Faction,
				Current: i.Current,
				Required: i.Required,
				"24h change": i.Delta,
				"%": {
					value: `${percent}%`,
					dataOrder: percent
				},
				Updated: {
					value: sb.Utils.timeDelta(i.Last_Update),
					dataOrder: i.Last_Update.valueOf()
				}
			};
		});

		res.render("generic-list-table", {
			title: `AQ War Effort - ${sb.Utils.capitalize(server)}`,
			data: printData,
			head: Object.keys(printData[0]),
			pageLength: 50,
			sortColumn: 5,
			sortDirection: "desc"
		});
	});

	Router.get("/aq-effort/:server/material/:faction/:material", async (req, res) => {
		let { server, faction, material } = req.params;
		server = server.replace(/_/g, " ");
		material = material.replace(/_/g, " ");

		const historyData = await Status.getMaterialHistory({ faction, material, server });
		if (historyData.length === 0) {
			return res.status(404).render("error", {
				error: "404 Not found",
				message: "No data found for given material/faction/server combination"
			});
		}

		const labels = [];
		const data = [];
		for (const historyItem of historyData) {
			labels.push(historyItem.Updated.format("m-d H:i"));
			data.push(historyItem.Amount);
		}

		res.render("generic-chart", {
			title: `AQ War Effort - ${sb.Utils.capitalize(server)} - ${material}`,
			chart: {
				title: `${material} (${faction})`,
				xAxis: {
					name: "Update",
					labels: JSON.stringify(labels)
				},
				yAxis: {
					name: "Materials handed in"
				},
				dataName: "Material",
				data: JSON.stringify(data)
			}
		});
	});

	return Router;
})();