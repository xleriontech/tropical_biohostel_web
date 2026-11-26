import { Injectable, BadRequestException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execGit = promisify(execFile);
// backend/(src|dist) -> raíz del proyecto (repo git)
const REPO = join(__dirname, '..', '..');

async function git(...args: string[]): Promise<string> {
  try {
    const { stdout } = await execGit('git', args, { cwd: REPO, timeout: 120000 });
    return stdout.trim();
  } catch (e: any) {
    const out = [e.stdout, e.stderr, e.message].filter(Boolean).join('\n');
    throw new BadRequestException('Git falló: ' + out.slice(0, 800));
  }
}

async function hayRepo(): Promise<boolean> {
  try {
    await execGit('git', ['rev-parse', '--is-inside-work-tree'], { cwd: REPO, timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

@Injectable()
export class RepoService {
  async estado() {
    if (!(await hayRepo())) {
      return {
        disponible: false,
        motivo: 'Este backend corre sin repositorio git (despliegue en la nube). Publica desde tu servidor local en intranet.',
        rama: '', remoto: '', cambios: [], pendientesPush: 0, ultimosCommits: [],
      };
    }
    const [rama, porcelain, log, ahead, remoto] = await Promise.all([
      git('rev-parse', '--abbrev-ref', 'HEAD').catch(() => ''),
      git('status', '--porcelain').catch(() => ''),
      git('log', '--oneline', '-5').catch(() => ''),
      git('rev-list', '--count', '@{upstream}..HEAD').catch(() => '0'),
      git('remote', 'get-url', 'origin').catch(() => ''),
    ]);
    const cambios = porcelain
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean)
      .map((l) => ({ estado: l.slice(0, 2).trim() || '?', archivo: l.slice(2).trim() }));
    return {
      disponible: true,
      rama: rama || 'main',
      remoto: remoto.replace(/:[^@/]+@/, ':***@'),
      cambios,
      pendientesPush: parseInt(ahead || '0', 10) || 0,
      ultimosCommits: log.split('\n').filter(Boolean),
    };
  }

  async publicar(mensaje: string, token?: string) {
    if (!(await hayRepo())) {
      throw new BadRequestException(
        'Este backend no tiene repositorio git (nube). Publica desde tu servidor local en intranet.',
      );
    }
    const msg = (mensaje || '').trim().slice(0, 200);
    if (!msg) throw new BadRequestException('Escribe un mensaje para el commit.');
    await git('add', '-A');
    const st = await git('status', '--porcelain');
    const rama = (await git('rev-parse', '--abbrev-ref', 'HEAD')) || 'main';
    if (!st) {
      // Sin cambios locales: intenta solo el push (por si hay commits pendientes)
      if (token) {
        const b64 = Buffer.from(`x-access-token:${token.trim()}`).toString('base64');
        await git('-c', `http.extraHeader=Authorization: Basic ${b64}`, 'push', '-u', 'origin', rama);
        return { ok: true, detalle: 'Publicado en origin/' + rama };
      }
      return { ok: true, detalle: 'Sin cambios para publicar.' };
    }
    await git('-c', 'user.name=Xlerion', '-c', 'user.email=dev@xlerion.com', 'commit', '-m', msg);
    if (token) {
      const b64 = Buffer.from(`x-access-token:${token.trim()}`).toString('base64');
      await git('-c', `http.extraHeader=Authorization: Basic ${b64}`, 'push', '-u', 'origin', rama);
    } else {
      await git('push', '-u', 'origin', rama);
    }
    const log = await git('log', '--oneline', '-3');
    return { ok: true, detalle: 'Publicado en origin/' + rama, log: log.split('\n') };
  }
}
