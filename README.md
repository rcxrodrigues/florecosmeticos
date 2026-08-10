# Florè Cosméticos — versão estática

Réplica da landing page do projeto Lovable (`Flore Cosméticos.zip`, TanStack Start + React),
convertida para HTML/CSS/JS puro. Mesmo conteúdo, mesmas cores, mesma tipografia,
mesmos comportamentos — sem framework, sem build, sem servidor.

## Estrutura

```
index.html                        landing do produto        →  /
about/index.html                  Sobre a Florè             →  /about
policies/privacy/index.html       Política de privacidade   →  /policies/privacy
policies/refund/index.html        Política de reembolso     →  /policies/refund
policies/shipping/index.html      Política de envio         →  /policies/shipping
policies/terms/index.html         Termos de serviço         →  /policies/terms
favicon.ico
robots.txt
assets/css/styles.css             Tailwind v4.3.3 já compilado (serve as 6 páginas)
assets/js/app.js                  comportamentos da landing (galeria, sacola, acordeões…)
assets/img/                       imagens
```

As pastas preservam as URLs originais do Lovable: `/about` e `/policies/privacy`
continuam funcionando iguais. Todos os caminhos são relativos, então o site
funciona tanto na raiz do domínio quanto dentro de uma subpasta.

## Onde colar códigos de rastreamento

Tudo fica visível em HTML cru — o Tag Assistant, o verificador do Google Ads, o Meta
e qualquer crawler leem direto do arquivo. **O bloco é idêntico nas 6 páginas**, então
o que você colar precisa ser replicado em cada `index.html` (era o que o `__root.tsx`
fazia sozinho no projeto React).

**No `<head>`** — logo nas primeiras linhas do arquivo:

```html
<head>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){ ... })(window,document,'script','dataLayer','GTM-MZWT6MJK');</script>
<!-- End Google Tag Manager -->

<!-- ↓ cole aqui Meta Pixel, TikTok Pixel, Google Ads, Clarity, etc. -->
```

**No `<body>`** — o `<noscript>` do GTM já é o **primeiro** elemento dentro de `<body>`,
que é onde o Google exige que ele fique:

```html
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MZWT6MJK" ...></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

Para trocar o container, substitua todas as ocorrências de `GTM-MZWT6MJK` (duas por página,
doze no total).

As quatro páginas de política levam `<meta name="robots" content="noindex">`, exatamente
como no projeto original.

## O que já vem configurado

| Item | Valor |
| --- | --- |
| Container GTM | `GTM-MZWT6MJK` (head + noscript) |
| Utmify | os dois scripts do projeto original, no `<head>` |
| Captura de UTMs | `app.js` — grava em `localStorage` (`flore_utms`) e repassa ao checkout |
| Checkout Preto | `https://checkout.pagou.ai/checkout/chk_01KYREJQKXAFXD0X6K3W8C3WAJ` |
| Checkout Marrom | `https://checkout.pagou.ai/checkout/chk_01KYREK28M032GAP0NJXQXTY6P` |
| Newsletter | Supabase REST (`email_subscribers`), com a mesma chave publishable |

## Mobile e performance

As imagens foram reencodadas para WebP e redimensionadas para o tamanho real de
exibição (×2 para telas retina): **4,27 MB → 334 KB, uma redução de 92%**. Os piores
casos eram `dlk.png` (uma foto salva como PNG, 1,5 MB) e o banner vegano (1,1 MB).
Uma primeira visita no celular baixa cerca de 137 KB.

Outros ajustes de mobile, todos invisíveis no desktop:

- **Área de toque de 44px** nos controles de ícone (setas do aviso, lupa, sacola,
  quantidade, cores, redes sociais). O tamanho visual continua igual — a área extra
  vem de um pseudo-elemento invisível, aplicado só em telas de toque via
  `@media (pointer: coarse)`.
- **`touch-action: manipulation`** em botões e links, para eliminar o atraso de
  ~300ms do toque.
- **Rolagem sem travar**: o listener da barra fixa é passivo e agrupado em
  `requestAnimationFrame`.
- **Sem deslocamento de layout**: toda imagem declara `width`/`height`, então o
  espaço já fica reservado antes de ela carregar.
- **`prefers-reduced-motion`** respeitado — desliga a pulsação do aviso de urgência
  e as transições para quem configurou isso no sistema.
- Os rótulos dos diferenciais quebram linha no celular. No projeto original eles
  tinham `whitespace-nowrap` fixo e "Em compras acima de R$ 99" era cortado numa
  tela de 375px; agora o `nowrap` só vale de `md:` (768px) para cima.

Verificado sem rolagem horizontal de 320px a 1440px, nas 6 páginas.

## Imagens que faltam

Três imagens da seção do meio da página ficavam no CDN da Lovable e **não vieram no zip**
(só os arquivos `.asset.json` que apontavam para elas). Baixe-as do projeto Lovable e
coloque em `assets/img/` com estes nomes exatos:

- `modo_de_uso.png`
- `desc1.png`
- `sem_esforco.png`

Enquanto elas não estiverem lá, aquela seção aparece vazia. O resto da página funciona normalmente.

## Como testar localmente

```bash
python -m http.server 8893 --directory flore-cosmeticos-static
```

Abra `http://localhost:8893`. Abrir o `index.html` com duplo clique também funciona,
mas o formulário de newsletter só responde via `http://`.

## Publicação

O repositório é [rcxrodrigues/florecosmeticos](https://github.com/rcxrodrigues/florecosmeticos)
e esta pasta é a raiz dele — o que está aqui é exatamente o que vai para o ar.

**Envio automático:** um hook `Stop` em `../.claude/settings.json` roda
`../.claude/publicar-site.sh` ao fim de cada conversa. Se houver mudança nesta pasta,
ele faz commit e push sozinho. Sem mudança, não faz nada.

Para publicar à mão a qualquer momento:

```bash
bash .claude/publicar-site.sh
```

Para desligar o envio automático, remova o bloco `hooks` de `.claude/settings.json`.

Sendo um site estático, ele sobe em qualquer lugar sem configuração: Vercel, Netlify,
Cloudflare Pages, GitHub Pages, Hostinger, cPanel. Conectando o repositório a um
desses serviços, cada push vira um deploy.
