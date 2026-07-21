export default async function handler(req: any, res: any) {
	try {
		// Lightweight health endpoint for debugging on Vercel
		if (req.url && (req.url.startsWith('/__health') || req.url.indexOf('__health') !== -1)) {
			res.setHeader('content-type', 'application/json');
			res.status(200).end(JSON.stringify({ ok: true }));
			return;
		}

		// Dynamically import the Express app to catch import-time errors
		// Prefer the compiled bundle if present on the platform (dist/server.cjs)
		let mod: any;
		try {
			mod = await import('../dist/server.cjs');
		} catch (e) {
			// Fallback to source import during local/dev
			mod = await import('../server');
		}

		// Try to resolve the actual Express app/handler from various bundler shapes
		function resolveApp(candidate: any) {
			let depth = 0;
			while (candidate && depth < 6) {
				if (typeof candidate === 'function') return candidate;
				if (candidate && typeof candidate.handle === 'function') return candidate;
				if (candidate && candidate.default) {
					candidate = candidate.default;
					depth++;
					continue;
				}
				if (candidate && candidate['module.exports']) {
					candidate = candidate['module.exports'];
					depth++;
					continue;
				}
				break;
			}
			return null;
		}

		const serverApp = resolveApp(mod) || resolveApp(mod && mod.default) || mod;

		// serverApp can be a function (callable Express app) or an object with a `.handle` method
		if (typeof serverApp === 'function') {
			return serverApp(req, res);
		}

		if (serverApp && typeof serverApp.handle === 'function') {
			return serverApp.handle(req, res);
		}

		// For debugging, return the module shape so we can inspect what was imported on Vercel
		const modInfo: any = {
			modType: typeof mod,
			defaultType: typeof (mod && mod.default),
			modKeys: mod && Object.keys ? Object.keys(mod) : null
		};
		res.setHeader('content-type', 'application/json');
		res.status(500).end(JSON.stringify({ error: 'Imported server module did not export an Express app function or handler', modInfo }));
		return;
	} catch (err: any) {
		console.error('Vercel handler error:', err && err.stack ? err.stack : err);
		// Return plain JSON with error message for debugging (remove before production)
		res.setHeader('content-type', 'application/json');
		res.status(500).end(JSON.stringify({ error: 'Internal server error (handler).', message: String(err && err.message ? err.message : err) }));
		return;
	}
}

export const config = {
	runtime: 'nodejs',
};