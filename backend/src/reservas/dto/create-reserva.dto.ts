import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, Min, IsEnum, IsEmail } from 'class-validator';

export class CreateReservaDto {
  @IsString()
  @IsNotEmpty()
  propiedadId: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsString()
  @IsNotEmpty()
  identificacion: string;

  @IsDateString()
  @IsNotEmpty()
  fechaLlegada: string;

  @IsDateString()
  @IsNotEmpty()
  fechaSalida: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  huespedes?: number;

  @IsOptional()
  @IsEnum(['TARJETA', 'EFECTIVO'])
  metodoPago?: 'TARJETA' | 'EFECTIVO';

  @IsOptional()
  @IsString()
  notas?: string;
}
