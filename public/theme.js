// Aplica o tema antes da primeira pintura, para a tela não piscar clara.
// Arquivo à parte (e não script embutido) por causa da política de segurança
// do site, que só executa scripts do próprio domínio. Espelha src/lib/theme.ts.
(function () {
  try {
    var pref = localStorage.getItem('audite-theme')
    var dark = pref === 'dark' || (pref !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', dark ? '#0C0D10' : '#F7F8FA')
  } catch (e) { /* sem armazenamento: fica no claro */ }
})()
