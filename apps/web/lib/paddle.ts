import { Paddle, Environment } from '@paddle/paddle-node-sdk';

export function getPaddle() {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error('PADDLE_API_KEY is not set');
  const isProd = process.env.PADDLE_ENVIRONMENT === 'production';
  return new Paddle(key, { environment: isProd ? Environment.production : Environment.sandbox });
}
