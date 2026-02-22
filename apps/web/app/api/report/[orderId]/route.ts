import { proxyGet } from '../../_proxy';

export async function GET(_: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params;
  return proxyGet(`/report/${orderId}`);
}
