import { proxyGet } from '../../_proxy';
export async function GET(_: Request, ctx: { params: { orderId: string } }) {
  return proxyGet(`/report/${ctx.params.orderId}`);
}
