const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Workaround for Android dev-client getting stuck with:
// okhttp ProtocolException while parsing chunked multipart (BundleDownloader.processMultipartResponse).
// Force Metro to serve a plain JS bundle (non-multipart) by stripping the multipart accept header.
config.server = config.server ?? {};
const originalEnhanceMiddleware = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (middleware, server) => {
	const enhanced = originalEnhanceMiddleware
		? originalEnhanceMiddleware(middleware, server)
		: middleware;

	return (req, res, next) => {
		try {
			const url = req?.url ?? "";
			const accept = req?.headers?.accept;
			const isBundleRequest =
				url.includes(".bundle") ||
				url.includes("/index.bundle") ||
				url.includes("/index.bundle?") ||
				url.includes("/index.bundle&") ||
				url.includes("/\"index.bundle\"");

			if (isBundleRequest && typeof accept === "string") {
				// Replace multipart/mixed with application/javascript to prevent multipart streaming.
				req.headers.accept = accept
					.split(",")
					.map((s) => s.trim())
					.filter((v) => v && !v.startsWith("multipart/mixed"))
					.concat(["application/javascript"])
					.join(", ");
			}
		} catch {
			// Best-effort; never block the request.
		}

		return enhanced(req, res, next);
	};
};

module.exports = config;
