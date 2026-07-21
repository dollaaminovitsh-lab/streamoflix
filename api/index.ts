import serverApp from '../server';

export default function handler(req: any, res: any) {
	return serverApp(req, res);
}

export const config = {
	runtime: 'nodejs',
};