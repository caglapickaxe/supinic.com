module.exports = (function () {
	"use strict";

	const Express = require("express");
	const Router = Express.Router();

	const DallE = require("../../../modules/data/dall-e.js");

	Router.get("/detail/:id", async (req, res) => {
		const data = await DallE.getImages(req.params.id);
		if (!data) {
			return sb.WebUtils.apiFail(res, 404, "Image set does not exist");
		}

		return sb.WebUtils.apiSuccess(res, data);
	});

	return Router;
})();
