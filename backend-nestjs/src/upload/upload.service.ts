import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const CARPETAS_PERMITIDAS = ['propiedades', 'ads', 'sponsors', 'parallax', 'logo', 'general', 'certificates', 'menus', 'videos'];
const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
};

@Injectable()
export class UploadService {
  private accountId: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    this.accountId = String(config.get('R2_ACCOUNT_ID') ?? '');
    this.accessKeyId = String(config.get('R2_ACCESS_KEY_ID') ?? '');
    this.secretAccessKey = String(config.get('R2_SECRET_ACCESS_KEY') ?? '');
    this.bucket = String(config.get('R2_BUCKET_NAME') ?? '');
    this.publicUrl = String(config.get('R2_PUBLIC_URL') ?? '');
  }

  /** ¿Hay credenciales R2 configuradas? Si no, se guarda en disco local. */
  usarR2(): boolean {
    return !!(this.accountId && this.accessKeyId && this.secretAccessKey && this.bucket);
  }

  private carpetaSegura(carpeta?: string): string {
    const c = (carpeta || 'general').toLowerCase().replace(/[^a-z]/g, '');
    return CARPETAS_PERMITIDAS.includes(c) ? c : 'general';
  }

  private extensionDe(file: Express.Multer.File): string {
    return (
      EXT_POR_MIME[file.mimetype] ||
      file.originalname.split('.').pop()?.toLowerCase() ||
      'bin'
    );
  }

  /** Guarda en disco local (uploads/) y devuelve ruta relativa servida en /uploads. */
  private guardarLocal(file: Express.Multer.File, carpeta: string): string {
    const dir = path.join(process.cwd(), 'uploads', carpeta);
    fs.mkdirSync(dir, { recursive: true });
    const nombre = `${uuid()}.${this.extensionDe(file)}`;
    fs.writeFileSync(path.join(dir, nombre), file.buffer);
    return `/uploads/${carpeta}/${nombre}`;
  }

  private signRequest(method: string, contentType: string, key: string, date: string) {
    const stringToSign = `${method}\n\n${contentType}\n${date}\n/${this.bucket}/${key}`;
    const signature = crypto
      .createHmac('sha1', this.secretAccessKey)
      .update(stringToSign)
      .digest('base64');
    return `AWS ${this.accessKeyId}:${signature}`;
  }

  private async putObject(key: string, body: Buffer, contentType: string) {
    const date = new Date().toUTCString();
    const auth = this.signRequest('PUT', contentType, key, date);
    const url = `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucket}/${key}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: auth,
        Date: date,
        'Content-Type': contentType,
      },
      body: new Uint8Array(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`R2 upload failed (${res.status}): ${text}`);
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    propertyId: string,
  ): Promise<{ url: string; thumbUrl: string }> {
    if (!this.usarR2()) {
      const url = this.guardarLocal(file, 'propiedades');
      return { url, thumbUrl: url };
    }
    const id = uuid();
    const ext = file.mimetype.split('/')[1];
    const key = `properties/${propertyId}/${id}.${ext}`;
    const thumbKey = `properties/${propertyId}/${id}_thumb.${ext}`;

    await this.putObject(key, file.buffer, file.mimetype);

    return {
      url: `${this.publicUrl}/${key}`,
      thumbUrl: `${this.publicUrl}/${thumbKey}`,
    };
  }

  async uploadCertificate(
    file: Express.Multer.File,
    propertyId: string,
  ): Promise<string> {
    if (!this.usarR2()) {
      return this.guardarLocal(file, 'certificates');
    }
    const id = uuid();
    const ext = file.originalname.split('.').pop() || 'pdf';
    const key = `certificates/${propertyId}/${id}.${ext}`;

    await this.putObject(key, file.buffer, file.mimetype);

    return `${this.publicUrl}/${key}`;
  }

  /**
   * Subida genérica (anuncios, logos, parallax, logo del sitio...).
   * Usa R2 si está configurado, si no disco local. Devuelve URL
   * absoluta (R2) o relativa /uploads/... (local).
   */
  async subirGenerico(file: Express.Multer.File, carpeta?: string): Promise<{ url: string }> {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Archivo vacío o no recibido.');
    }
    const safe = this.carpetaSegura(carpeta);
    if (!this.usarR2()) {
      return { url: this.guardarLocal(file, safe) };
    }
    const key = `${safe}/${uuid()}.${this.extensionDe(file)}`;
    await this.putObject(key, file.buffer, file.mimetype);
    return { url: `${this.publicUrl}/${key}` };
  }
}
