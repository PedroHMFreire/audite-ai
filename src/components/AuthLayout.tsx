import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'

/** Moldura das telas de entrada: cadastro, login e recuperação de senha. */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="container-safe flex h-14 items-center">
        <Link to="/" aria-label="Audite — página inicial">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-4xl font-normal leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-zinc-500">{footer}</div>}
        </div>
      </main>
    </div>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  )
}

/** Traduz os erros mais comuns do Supabase Auth. */
export function authErrorMessage(err: unknown): string {
  const msg = (err as any)?.message ? String((err as any).message) : ''
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar. Enviamos um link para a sua caixa de entrada.'
  if (/already registered|already been registered|user already exists/i.test(msg)) return 'Já existe uma conta com este e-mail. Entre ou recupere a senha.'
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
  if (/password should be|weak password/i.test(msg)) return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.'
  if (/same password|different from the old/i.test(msg)) return 'A nova senha precisa ser diferente da atual.'
  if (/failed to fetch|network/i.test(msg)) return 'Sem conexão. Verifique sua internet e tente de novo.'
  return msg || 'Algo deu errado. Tente novamente.'
}
