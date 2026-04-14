import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class BusinessHoursGuard implements CanActivate {
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const method = request.method;

        // Permitimos todas las consultas (lectura)
        if (method === 'GET') {
            return true;
        }

        // Obtener la fecha y hora actual en la zona configurada
        // El servidor debe estar en America/Mexico_City (visto en .env)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        const hours = now.getHours();

        // Restricción: Lunes (1) a Viernes (5)
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

        // Restricción: 8:00 AM a 4:00 PM (16:00)
        // La acción se bloquea si es antes de las 8 o a partir de las 16:00:00
        const isWorkingHours = hours >= 8 && hours < 16;

        if (!isWeekday || !isWorkingHours) {
            throw new ForbiddenException(
                `Acción bloqueda: Las operaciones administrativas solo están permitidas de Lunes a Viernes de 08:00 a 16:00 horas.`,
            );
        }

        return true;
    }
}
