import { Link } from 'react-router-dom'
import { Mail, ExternalLink, Shield, FileText, Building, Heart } from 'lucide-react'
import Logo from './Logo'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-zinc-100 dark:border-zinc-900 mt-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        
        {/* Seção Principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          
          {/* Logo e Descrição */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Logo />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Sistema inteligente de auditoria de estoque para empresas.
            </p>
          </div>

          {/* Links Úteis */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Links Úteis</h4>
            <nav className="flex flex-col gap-1">
              <Link 
                to="/trial-signup" 
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Teste Grátis por 15 dias
              </Link>
              <Link 
                to="/ajuda" 
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                Central de Ajuda
              </Link>
              <a 
                href="mailto:contato@rakaimidia.com" 
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                Contato
              </a>
            </nav>
          </div>

          {/* Contato */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Suporte</h4>
            <div className="space-y-1">
              <a 
                href="mailto:contato@rakaimidia.com" 
                className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                <Mail className="h-3 w-3" />
                contato@rakaimidia.com
              </a>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                Sistema Operacional
              </div>
            </div>
          </div>
        </div>

        {/* Seção Inferior */}
        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            
            {/* Links Legais */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <Link 
                to="/privacidade" 
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                Privacidade
              </Link>
              <Link 
                to="/termos" 
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                Termos
              </Link>
              <Link 
                to="/cookies" 
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                Cookies
              </Link>
            </div>
            
            {/* Copyright */}
            <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span>© {currentYear} Rakai Mídia</span>
              <Heart className="h-2 w-2 text-red-500 fill-current" />
            </div>
          </div>
        </div>

        {/* Badge Rakai Mídia */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <Building className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              Produto exclusivo da
            </span>
            <strong className="text-xs text-zinc-900 dark:text-zinc-100">Rakai Mídia</strong>
            <a 
              href="https://rakaimidia.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <ExternalLink className="h-2 w-2" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
