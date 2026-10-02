import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private supabase?: SupabaseClient;
  private useLocalAuth: boolean;

  constructor(
    private config: ConfigService,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {
    const supabaseUrl = String(this.config.get('SUPABASE_URL') || '');
    const supabaseKey = String(this.config.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    this.useLocalAuth = supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project');
    if (!this.useLocalAuth) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  async signInWithPassword(email: string, password: string) {
    if (this.useLocalAuth) {
      return this.localSignIn(email, password);
    }
    const { data, error } = await this.supabase!.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new UnauthorizedException(error.message);
    if (!data.user) throw new UnauthorizedException('No user returned');

    let user = await this.prisma.user.findUnique({
      where: { supabaseId: data.user.id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: data.user.email ?? email,
          supabaseId: data.user.id,
          nombre: (data.user.user_metadata as any)?.nombre || null,
          role: 'turista',
        },
      });
    }

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { access_token: token, user };
  }

  async signUp(email: string, password: string, nombre?: string) {
    if (this.useLocalAuth) {
      return this.localSignUp(email, password, nombre);
    }
    const { data, error } = await this.supabase!.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });

    if (error) throw new UnauthorizedException(error.message);
    if (!data.user) throw new UnauthorizedException('No user returned');

    const user = await this.prisma.user.create({
      data: {
        email: data.user.email ?? email,
        supabaseId: data.user.id,
        nombre,
        role: 'turista',
      },
    });

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { access_token: token, user };
  }

  async validateToken(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async localSignIn(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const rows: any[] = await this.prisma.$queryRawUnsafe(
      'SELECT "passwordHash" FROM "User" WHERE id = $1',
      user.id,
    );
    const hash = rows[0]?.passwordHash;
    if (!hash || !bcrypt.compareSync(password, hash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { access_token: token, user };
  }

  private async localSignUp(email: string, password: string, nombre?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const hash = bcrypt.hashSync(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        nombre,
        supabaseId: `local_${email}`,
        role: 'turista',
      },
    });

    await this.prisma.$executeRawUnsafe(
      'UPDATE "User" SET "passwordHash" = $1 WHERE id = $2',
      hash,
      user.id,
    );

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { access_token: token, user };
  }
}
