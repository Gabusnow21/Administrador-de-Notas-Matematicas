import { Estudiante } from "./estudiante";

export enum EstadoAsistencia {
    PRESENTE = 'PRESENTE',
    TARDE = 'TARDE',
    AUSENTE = 'AUSENTE',
    EXCUSADO = 'EXCUSADO'
}

export interface Asistencia {
    id: number;
    estudiante: Estudiante;
    fecha: string;
    hora: string;
    estado: EstadoAsistencia;
}

export interface AsistenciaRequest {
    estudianteId?: number;
    nfcId?: string;
    fecha?: string;
    hora?: string;
    estado: EstadoAsistencia;
}
