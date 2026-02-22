import { proxyPost } from '../../_proxy';
export async function POST(req: Request) { return proxyPost(req, '/report/preview'); }
