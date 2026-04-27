import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const ip = extractIpManual(request);

    return cleanIp(ip);
  },
);

// Método mejorado de extracción
function extractIpManual(req: any): string {
  // Prioridad de headers (de más confiable a menos)
  const headersToCheck = [
    'x-client-ip', // Personalizado
    'x-forwarded-for', // Standard proxy
    'cf-connecting-ip', // Cloudflare
    'fastly-client-ip', // Fastly
    'x-real-ip', // Nginx
    'x-cluster-client-ip', // Rackspace LB, Riverbed Stingray
    'x-forwarded', // General
    'forwarded-for', // RFC 7239
    'forwarded', // RFC 7239
  ];

  // 1. Revisar headers personalizados primero
  for (const header of headersToCheck) {
    const value = req.headers[header];
    if (value) {
      const ip = Array.isArray(value) ? value[0] : value;
      return ip;
    }
  }

  // 2. Revisar conexión directa
  const connectionIp =
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress;

  if (connectionIp && connectionIp !== '::1') {
    return connectionIp;
  }

  // 3. Último recurso
  return req.ip || 'unknown';
}

// Limpiar la IP
function cleanIp(ip: string): string {
  if (!ip) return 'unknown';

  // Si hay múltiples IPs (load balancer)
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  // Convertir IPv6 localhost a IPv4
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') {
    return '127.0.0.1';
  }

  // Remover prefijo IPv6
  if (ip.includes('::ffff:')) {
    ip = ip.split(':').pop() || ip;
  }

  return ip;
}
