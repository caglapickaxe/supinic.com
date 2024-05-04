export const definition = {
	name: "Helix",
	optionsType: "object",
	options: {
		prefixUrl: "https://api.twitch.tv/helix/",
		responseType: "json",
		throwHttpErrors: false,
		headers: {
		},
		hooks: {
			beforeRequest: [
				async (options) => {
					const clientId = sb.Config.get("TWITCH_CLIENT_ID", false);
					if (!clientId) {
						throw new Error("Missing config value for Twitch Client-ID, Helix cannot be accessed");
					}

					const token = await sb.Cache.getByPrefix("TWITCH_OAUTH") ?? sb.Config.get("TWITCH_OAUTH", false);
					if (!token) {
						throw new Error("Missing config value for Twitch auth token, Helix cannot be accessed");
					}

					options.headers["Client-ID"] = clientId;
					options.headers.authorization = `Bearer ${token}`;
				}
			]
		}
	},
	parent: "Global",
	description: "Twitch Helix API definition"
};
