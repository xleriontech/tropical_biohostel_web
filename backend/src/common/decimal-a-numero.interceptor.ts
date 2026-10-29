import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { decimalesANumero } from './dinero';

/**
 * El dinero se almacena como numeric(12,2) y Prisma lo entrega como Decimal.
 * Sin este interceptor el JSON viajaría como string ("150000") y el frontend
 * perdería formato y aritmética; el contrato de la API sigue siendo numérico.
 */
@Injectable()
export class DecimalALaNumeroInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => decimalesANumero(data)));
  }
}
