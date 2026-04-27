import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RealIpMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const ip = this.getRealIp(req);

    // Guardar en el request para uso posterior
    (req as any).realIp = ip;

    // Para debugging
    console.log(`🔍 IP detectada: ${ip}`);
    console.log(`📋 Headers disponibles:`, Object.keys(req.headers));
    console.log(`🌐 X-Forwarded-For: ${req.headers['x-forwarded-for']}`);
    console.log(`🌐 X-Real-IP: ${req.headers['x-real-ip']}`);

    next();
  }

  private getRealIp(req: Request): string {
    // Lista completa de headers a verificar
    const ipSources = [
      req.headers['x-client-ip'],
      req.headers['x-forwarded-for'],
      req.headers['cf-connecting-ip'],
      req.headers['fastly-client-ip'],
      req.headers['x-real-ip'],
      req.headers['x-cluster-client-ip'],
      req.headers['x-forwarded'],
      req.headers['forwarded-for'],
      req.headers['forwarded'],
      req.headers['via'],
      req.connection?.remoteAddress,
      req.socket?.remoteAddress,
      req.ip,
    ];

    for (const source of ipSources) {
      if (source && source !== '::1') {
        let ip = Array.isArray(source) ? source[0] : source.toString();

        // Limpiar IP
        ip = this.cleanIp(ip);

        if (ip && ip !== '::1' && ip !== '127.0.0.1') {
          return ip;
        }
      }
    }

    return '127.0.0.1'; // Fallback
  }

  private cleanIp(ip: string): string {
    if (!ip) return '';

    // Remover múltiples IPs
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // IPv6 localhost
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') {
      return '127.0.0.1';
    }

    // Remover prefijo IPv6-mapped IPv4
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    return ip;
  }
}
