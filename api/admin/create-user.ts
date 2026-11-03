import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export async function createUserHandler(req: Request, res: Response) {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({
        error: 'Todos os campos são obrigatórios (nome, e-mail, senha e perfil de acesso).',
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        error: 'A senha deve conter no mínimo 6 caracteres.',
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !secretKey) {
      return res.status(500).json({
        error: 'Configurações de servidor do Supabase (SUPABASE_SECRET_KEY) não encontradas.',
      });
    }

    // Remove eventuais sufixos /rest/v1/ ou barras da URL
    const cleanUrl = supabaseUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    const adminClient = createClient(cleanUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const cleanEmail = email.trim().toLowerCase();

    // 1. Cria o usuário diretamente no Supabase Auth com e-mail já confirmado
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
      },
    });

    if (authError) {
      let friendlyError = authError.message;
      if (authError.message.includes('already been registered')) {
        friendlyError = 'Este e-mail já está cadastrado no sistema.';
      }
      return res.status(400).json({ error: friendlyError });
    }

    const userId = authData.user.id;

    // 2. Insere ou atualiza o perfil correspondente na tabela public.profiles
    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .upsert([
        {
          id: userId,
          full_name: fullName.trim(),
          email: cleanEmail,
          role: role,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Erro ao registrar perfil na tabela profiles:', profileError);
      return res.status(500).json({
        error: `Usuário autenticado, mas ocorreu erro no banco: ${profileError.message}`,
      });
    }

    return res.status(200).json({
      success: true,
      user: profileData,
      message: 'Usuário cadastrado com sucesso!',
    });
  } catch (err: any) {
    console.error('Erro inesperado ao cadastrar usuário:', err);
    return res.status(500).json({
      error: err.message || 'Erro interno ao processar cadastro de usuário.',
    });
  }
}
