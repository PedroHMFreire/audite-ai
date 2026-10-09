import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { deleteMyAccount, exportMyData, getProfile, updateProfile } from '@/lib/account'
import { InputValidator } from '@/lib/security'
import { SUPPORT_EMAIL } from '@/lib/plan'
import { describeAccess, useAccess, useAuth } from '@/contexts'
import { useInstallApp } from '@/hooks/usePWAPrompt'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { FormError, authErrorMessage } from '@/components/AuthLayout'

export default function Account() {
  const nav = useNavigate()
  const { user, signOut } = useAuth()
  const { access } = useAccess()
  const { addToast } = useToast()
  const { canInstall, isStandalone, isIOS, install } = useInstallApp()

  const [storeName, setStoreName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getProfile().then((p) => {
      setStoreName(p?.store_name || '')
      setOwnerName(p?.owner_name || '')
      setPhone(p?.phone || '')
    }).catch(() => {})
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await updateProfile({
        store_name: InputValidator.sanitizeText(storeName) || null,
        owner_name: InputValidator.sanitizeText(ownerName) || null,
        phone: InputValidator.sanitizeText(phone) || null,
      })
      addToast({ type: 'success', message: 'Dados salvos', duration: 2000 })
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível salvar', description: err instanceof Error ? err.message : undefined })
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    const pw = InputValidator.password(password)
    if (!pw.valid) return setPasswordError(pw.errors[0])
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSavingPassword(false)
    if (error) return setPasswordError(authErrorMessage(error))
    setPassword('')
    addToast({ type: 'success', message: 'Senha alterada', duration: 2500 })
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportMyData()
    } catch (err) {
      addToast({ type: 'error', message: 'Não foi possível exportar', description: err instanceof Error ? err.message : undefined })
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteMyAccount()
      nav('/', { replace: true })
    } catch (err) {
      setConfirmDelete(false)
      addToast({ type: 'error', message: 'Não foi possível excluir a conta', description: err instanceof Error ? err.message : undefined, duration: 8000 })
    } finally {
      setDeleting(false)
    }
  }

  async function logout() {
    await signOut()
    nav('/login', { replace: true })
  }

  const status = describeAccess(access)

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="page-title">Conta</h1>
        <p className="page-subtitle">{user?.email}</p>
      </header>

      <nav aria-label="Atalhos da conta" className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        <RowLink to="/assinatura" title="Assinatura" detail={status.label} />
        <RowLink to="/catalogo" title="Catálogo de produtos" detail="Nomes das peças ao bipar" />
        <RowLink to="/ajuda" title="Ajuda" detail="Dúvidas e contato" />
        {access?.is_admin && <RowLink to="/admin" title="Administração" detail="Clientes e acessos" />}
      </nav>

      <section aria-labelledby="dados" className="card">
        <h2 id="dados" className="text-base font-semibold">Dados da loja</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div>
            <label htmlFor="store" className="label">Nome da loja</label>
            <input id="store" className="input" maxLength={100} value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="owner" className="label">Seu nome</label>
              <input id="owner" className="input" maxLength={100} autoComplete="name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="phone" className="label">Telefone</label>
              <input id="phone" className="input" maxLength={30} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn" disabled={savingProfile}>{savingProfile ? 'Salvando…' : 'Salvar'}</button>
        </form>
      </section>

      <section aria-labelledby="senha" className="card">
        <h2 id="senha" className="text-base font-semibold">Senha</h2>
        <form onSubmit={savePassword} className="mt-4 space-y-4">
          <div>
            <label htmlFor="new-password" className="label">Nova senha</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} className="input"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1.5 text-xs text-zinc-500">Pelo menos 8 caracteres.</p>
          </div>
          <FormError>{passwordError}</FormError>
          <button type="submit" className="btn btn-secondary" disabled={savingPassword || !password}>
            {savingPassword ? 'Salvando…' : 'Alterar senha'}
          </button>
        </form>
      </section>

      {!isStandalone && (canInstall || isIOS) && (
        <section aria-labelledby="instalar" className="card">
          <h2 id="instalar" className="text-base font-semibold">Instalar no celular</h2>
          {canInstall ? (
            <>
              <p className="mt-1 text-sm text-zinc-500">Deixe o Audite na tela inicial e abra como um aplicativo.</p>
              <button type="button" className="btn btn-secondary mt-4" onClick={install}>Instalar aplicativo</button>
            </>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="privacidade" className="card">
        <h2 id="privacidade" className="text-base font-semibold">Seus dados</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Baixe uma cópia de tudo o que você guardou no Audite ou exclua sua conta de forma definitiva.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Preparando…' : 'Baixar meus dados'}
          </button>
          <button type="button" className="btn btn-quiet text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)}>
            Excluir conta
          </button>
        </div>
      </section>

      <div className="flex flex-col items-start gap-4 border-t border-zinc-200 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="btn btn-secondary" onClick={logout}>Sair</button>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/termos" className="hover:text-ink">Termos de uso</Link>
          <Link to="/privacidade" className="hover:text-ink">Privacidade</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink">{SUPPORT_EMAIL}</a>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir sua conta?"
        description="Todas as contagens, relatórios, categorias e o cronograma serão apagados. Isso não pode ser desfeito."
        confirmLabel={deleting ? 'Excluindo…' : 'Excluir tudo'}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function RowLink({ to, title, detail }: { to: string; title: string; detail?: string }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-zinc-50">
      <span className="font-medium">{title}</span>
      <span className="flex items-center gap-2 text-sm text-zinc-500">
        {detail}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  )
}
