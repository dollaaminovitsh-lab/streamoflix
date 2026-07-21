export default async function handler(req: any, res: any) {
	try {
		// Lightweight health endpoint for debugging on Vercel
		if (req.url && req.url.startsWith('/__health')) {
			res.setHeader('content-type', 'application/json');
			res.status(200).end(JSON.stringify({ ok: true }));
			return;
		}

		// Dynamically import the Express app to catch import-time errors
		const mod = await import('../server');
		const serverApp = mod && mod.default ? mod.default : mod;

		if (typeof serverApp !== 'function') {
			throw new Error('Imported server module did not export an Express app function');
		}

		// Forward request to Express app instance (callable)
		return serverApp(req, res);
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