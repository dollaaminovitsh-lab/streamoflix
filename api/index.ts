import serverApp from '../server';

export default async function handler(req: any, res: any) {
	try {
		// Forward request to Express app instance
		// Express apps are callable as functions: app(req, res)
		return serverApp(req, res);
	} catch (err: any) {
		console.error('Vercel handler error:', err);
		res.status(500).json({ error: 'Internal server error (handler).' });
	}
}

export const config = {
	runtime: 'nodejs',
};