import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Search, ChevronDown, ExternalLink, AlertCircle } from 'lucide-react'
import { useAnalytics } from '@/lib/analytics'
import { supabase } from '@/lib/supabaseClient'

interface SupportTicket {
  id: string
  user_id: string
  subject: string
  description: string
  category: 'bug' | 'feature' | 'billing' | 'general'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  responses?: SupportResponse[]
}

interface SupportResponse {
  id: string
  ticket_id: string
  user_id?: string
  admin_id?: string
  message: string
  is_internal: boolean
  created_at: string
}

interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
  type?: 'text' | 'action' | 'suggestion'
}

interface KnowledgeBaseArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  views: number
  helpful_count: number
  created_at: string
}

// FAQ automatizado com respostas inteligentes
const FAQ_DATA = [
  {
    question: "Como faço upload de uma planilha?",
    answer: "Clique em 'Nova Contagem', depois em 'Envie a planilha'. Certifique-se que sua planilha tem as colunas: código, nome e saldo.",
    keywords: ["upload", "planilha", "arquivo", "excel"],
    category: "uso-basico"
  },
  {
    question: "Que formato de planilha é aceito?",
    answer: "Aceitamos Excel (.xlsx, .xls) e CSV. A planilha deve ter 3 colunas: código do produto, nome e quantidade em estoque.",
    keywords: ["formato", "excel", "csv", "planilha"],
    category: "uso-basico"
  },
  {
    question: "Como funciona o período de trial?",
    answer: "Você tem 7 dias gratuitos para testar todas as funcionalidades. Após esse período, escolha um plano para continuar.",
    keywords: ["trial", "gratuito", "teste", "periodo"],
    category: "billing"
  },
  {
    question: "Como cancelar minha assinatura?",
    answer: "Acesse 'Configurações > Assinatura' e clique em 'Cancelar'. Você manterá acesso até o fim do período pago.",
    keywords: ["cancelar", "assinatura", "parar"],
    category: "billing"
  },
  {
    question: "Posso exportar meus relatórios?",
    answer: "Sim! Todos os relatórios podem ser exportados em PDF ou Excel. Clique em 'Exportar' na página do relatório.",
    keywords: ["exportar", "relatorio", "pdf", "excel"],
    category: "funcionalidades"
  }
]

class SupportService {
  async createTicket(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert(ticket)
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        responses:support_responses(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async addResponse(ticketId: string, message: string, isInternal = false): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('support_responses')
      .insert({
        ticket_id: ticketId,
        user_id: user?.id,
        message,
        is_internal: isInternal
      })

    if (error) throw error
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeBaseArticle[]> {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .or(`title.ilike.%${query}%, content.ilike.%${query}%, tags.cs.{${query}}`)
      .order('views', { ascending: false })
      .limit(5)

    if (error) throw error
    return data || []
  }

  async getPopularArticles(): Promise<KnowledgeBaseArticle[]> {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('views', { ascending: false })
      .limit(10)

    if (error) throw error
    return data || []
  }
}

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'faq' | 'tickets'>('chat')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Olá! 👋 Como posso ajudar você hoje?',
      isUser: false,
      timestamp: new Date(),
      type: 'text'
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [faqSearch, setFaqSearch] = useState('')
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [showNewTicket, setShowNewTicket] = useState(false)
  
  const { track } = useAnalytics()
  const supportService = new SupportService()
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      track('SUPPORT_WIDGET_OPENED')
      loadUserTickets()
    }
  }, [isOpen])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const loadUserTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const userTickets = await supportService.getUserTickets(user.id)
        setTickets(userTickets)
      }
    } catch (error) {
      console.error('Erro ao carregar tickets:', error)
    }
  }

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    track('SUPPORT_MESSAGE_SENT', { message_length: inputMessage.length })

    // Processa resposta automática
    setTimeout(() => {
      const response = generateAutoResponse(inputMessage)
      setChatMessages(prev => [...prev, response])
    }, 1000)

    setInputMessage('')
  }

  const generateAutoResponse = (message: string): ChatMessage => {
    const lowerMessage = message.toLowerCase()
    
    // Busca na FAQ
    const matchingFAQ = FAQ_DATA.find(faq => 
      faq.keywords.some(keyword => lowerMessage.includes(keyword))
    )

    if (matchingFAQ) {
      return {
        id: Date.now().toString(),
        text: matchingFAQ.answer,
        isUser: false,
        timestamp: new Date(),
        type: 'suggestion'
      }
    }

    // Respostas padrão baseadas em palavras-chave
    if (lowerMessage.includes('erro') || lowerMessage.includes('problema')) {
      return {
        id: Date.now().toString(),
        text: 'Entendo que você está enfrentando um problema. Pode me descrever em mais detalhes o que está acontecendo? Ou prefere abrir um ticket para investigação?',
        isUser: false,
        timestamp: new Date(),
        type: 'action'
      }
    }

    if (lowerMessage.includes('preço') || lowerMessage.includes('plano')) {
      return {
        id: Date.now().toString(),
        text: 'Nossos planos são: Básico (R$29), Profissional (R$59) e Premium (R$99). Todos incluem 7 dias grátis. Quer saber mais sobre algum específico?',
        isUser: false,
        timestamp: new Date()
      }
    }

    // Resposta padrão
    return {
      id: Date.now().toString(),
      text: 'Obrigado pela sua mensagem! Um especialista entrará em contato em breve. Enquanto isso, que tal dar uma olhada na nossa FAQ ou criar um ticket detalhado?',
      isUser: false,
      timestamp: new Date(),
      type: 'action'
    }
  }

  const filteredFAQ = FAQ_DATA.filter(faq => 
    faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  )

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Widget de suporte */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl border z-50 flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <h3 className="font-semibold">Suporte Audite AI</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {[
              { id: 'chat', label: 'Chat' },
              { id: 'faq', label: 'FAQ' },
              { id: 'tickets', label: 'Tickets' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-4 text-sm ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && (
              <div className="h-full flex flex-col">
                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {chatMessages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.isUser
                            ? 'bg-blue-600 text-white'
                            : message.type === 'suggestion'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="h-full p-4">
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Buscar na FAQ..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                  />
                </div>

                {/* FAQ Items */}
                <div className="space-y-2 overflow-y-auto">
                  {filteredFAQ.map((faq, index) => (
                    <details key={index} className="border rounded-lg">
                      <summary className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                        <span className="text-sm font-medium">{faq.question}</span>
                        <ChevronDown className="w-4 h-4" />
                      </summary>
                      <div className="p-3 pt-0 text-sm text-gray-600">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tickets' && (
              <div className="h-full p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Meus Tickets</h4>
                  <button
                    onClick={() => setShowNewTicket(true)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Novo Ticket
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{ticket.subject}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                          ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{ticket.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}

                  {tickets.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Nenhum ticket encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default SupportWidget