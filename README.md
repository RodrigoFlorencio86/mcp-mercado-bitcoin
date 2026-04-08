# mcp-mercado-bitcoin

**Servidor MCP para o [Mercado Bitcoin](https://www.mercadobitcoin.com.br)** — consulte, compre, venda e gerencie seus ativos digitais diretamente pela sua LLM ou agente de IA favorito.

---

## O que é este MCP?

O **Model Context Protocol (MCP)** é um protocolo aberto criado pela Anthropic que permite que aplicações de Inteligência Artificial (como Claude, ChatGPT, Cursor e outros) se conectem a ferramentas e fontes de dados externas.

Este servidor MCP expõe a **API v4 completa do Mercado Bitcoin** como um conjunto de 31 ferramentas que qualquer LLM ou agente de IA compatível pode utilizar. Na prática, isso significa que você pode pedir ao seu assistente de IA para:

- Consultar preços e cotações em tempo real
- Verificar seus saldos e posições
- Comprar e vender criptoativos
- Gerenciar sua carteira, depósitos e saques

Tudo isso via conversa natural, sem precisar navegar pela interface da exchange.

---

## Aviso Legal e Termos de Uso

### Riscos de Ativos Digitais

**Ativos digitais, incluindo Bitcoin, Ether, tokens de Renda Fixa Digital, Fan Tokens, Utility Tokens, DeFi e outros produtos listados no Mercado Bitcoin, são investimentos de alto risco.** O mercado de criptoativos é extremamente volátil e está sujeito a:

- **Perda total do capital investido**
- Oscilações bruscas e imprevisíveis de preço
- Riscos regulatórios e de liquidez
- Riscos tecnológicos (falhas em smart contracts, ataques a redes, etc.)
- Indisponibilidade temporária ou permanente de plataformas

**Criptoativos NÃO são indicados para investidores com perfil Conservador.**

Antes de tomar qualquer decisão de investimento, o usuário deve:

1. **Conhecer seu perfil de investidor** — Preencha sua Análise de Perfil de Investidor (API/Suitability) na sua corretora ou banco
2. **Pesquisar e se educar** — Consulte fontes confiáveis como:
   - [ANBIMA EDU](https://www.anbima.com.br/pt_br/educar.htm) — Educação financeira
   - [Banco Central do Brasil](https://www.bcb.gov.br) — Regulação e informações sobre ativos virtuais
   - [CVM - Comissão de Valores Mobiliários](https://www.gov.br/cvm) — Alertas ao investidor e regulação
3. **Buscar orientação profissional** — Em caso de dúvidas, consulte um assessor de investimentos ou consultor financeiro certificado antes de operar

### Termos de Uso do MCP

**ESTE SOFTWARE É FORNECIDO "COMO ESTÁ" (AS IS), SEM GARANTIAS DE QUALQUER NATUREZA.**

- Este MCP é uma **ferramenta em versão beta** e pode conter erros estruturais, bugs, falhas de comunicação com a API do Mercado Bitcoin e outros problemas técnicos
- Os desenvolvedores **NÃO se responsabilizam** por:
  - Falhas de execução de ordens
  - Indisponibilidades do serviço (do MCP ou do Mercado Bitcoin)
  - Perdas financeiras decorrentes de erros de cotação, latência ou qualquer outro fator
  - Danos diretos, indiretos, incidentais ou consequenciais do uso deste software
- O MCP, no todo ou em parte, **poderá ser descontinuado ou retirado do ar sem aviso prévio**
- Qualquer cópia, fork ou derivação deste software **opera sob seus próprios riscos** — os desenvolvedores do projeto original não se responsabilizam por versões de terceiros
- **Ao utilizar este MCP, você reconhece e aceita integralmente todos os riscos acima**

### DYOR — Faça Sua Própria Diligência

**Faça sua própria diligência.** Pesquise sobre:

- Os **ativos digitais** que pretende negociar
- O **Mercado Bitcoin** como plataforma de negociação
- Este **MCP** como ferramenta de integração

Busque identificar a seriedade, confiabilidade e adequação de cada produto e ferramenta ao seu perfil. **Não opere sem compreender plenamente o que está fazendo. Se tiver dúvidas, não opere sem auxílio de profissionais qualificados.**

---

## Funcionalidades

- **31 ferramentas** cobrindo toda a API v4 do Mercado Bitcoin
- **Dados públicos**: cotações, livro de ofertas, trades, candles, símbolos, taxas, redes
- **Gestão de conta**: saldos, posições, nível de tier, taxas de negociação
- **Negociação**: compra/venda com ordens market, limit, stoplimit e post-only
- **Carteira**: depósitos, saques, endereços, contas bancárias, sub-contas
- **Modelo de segurança em 3 camadas** para proteger contra operações não autorizadas
- Compatível com **Claude Desktop, Claude Code, OpenClaw, Cursor** e qualquer cliente MCP

---

## Modelo de Segurança

### Camada 1 — Modos de Operação

Controla quais capacidades ficam disponíveis para a IA:

| Modo | Dados Públicos | Consultas de Conta | Negociação | Saques |
| ---- | :------------: | :----------------: | :--------: | :----: |
| `readonly` | Sim | Sim | Não | Não |
| `trading` (padrão) | Sim | Sim | Sim | Não |
| `full` | Sim | Sim | Sim | Sim |

**Recomendação:** Use `readonly` para monitoramento, `trading` para operações de compra/venda (sem saques), e `full` apenas se você realmente precisa de saques via IA.

### Camada 2 — Confirmação em Dois Passos

Toda operação que envolve movimentação financeira (compra, venda, cancelamento, saque, transferência) usa um **fluxo obrigatório de confirmação**:

1. **Primeira chamada** (confirm=false) → a IA recebe uma **prévia detalhada** da operação
2. A IA **mostra a prévia ao usuário** e pede aprovação explícita
3. **Segunda chamada** (confirm=true) → a operação é executada somente após aprovação

Defina `MB_AUTO_CONFIRM=true` **apenas** se você confia plenamente que o agente opere de forma autônoma. **Não recomendado para uso geral.**

### Camada 3 — Limites de Gasto

| Variável | Descrição |
| -------- | --------- |
| `MB_MAX_ORDER_BRL` | Valor máximo por ordem individual (em BRL) |
| `MB_DAILY_LIMIT_BRL` | Volume máximo diário de negociação (em BRL) |
| `MB_DRY_RUN=true` | Modo simulação — nenhuma operação é executada de verdade |

**Exemplo:** Configure `MB_MAX_ORDER_BRL=500` e `MB_DAILY_LIMIT_BRL=2000` para limitar a exposição a R$ 500 por ordem e R$ 2.000 por dia.

---

## Autenticação

O MCP utiliza o fluxo **OAuth2 Client Credentials** do Mercado Bitcoin:

### Como obter suas credenciais

1. Faça login na sua conta do [Mercado Bitcoin](https://www.mercadobitcoin.com.br) **via Web**
2. Clique no seu **Perfil** (canto superior direito)
3. Acesse **Configurações**
4. No menu lateral esquerdo, localize a seção **Integração** e clique em **Chaves API**
5. Clique em **Nova Chave**
6. Dê um **nome** para a chave (ex: "MCP Claude", "Agente Trading", etc.)
7. Defina a permissão:
   - **Leitura** — para monitoramento e consultas apenas
   - **Acesso total (permite trades)** — para compra, venda e operações
8. Clique em **Continuar** e siga as instruções de confirmação (2FA)
9. Salve o `client_id` (Chave de API) e o `client_secret` (Segredo da API) em local seguro

Importante: a imagem abaixo mostra que o Segredo da API é apresentado uma única vez no pop up e deve ser copiado/salvo imediatamente, pois não aparecerá novamente. Já o ID é a informação abaixo do pop-up e ficará disponível para consulta futura.

<img width="1113" height="753" alt="perfil5" src="https://github.com/user-attachments/assets/a564855a-fb1f-496b-9c9f-003c800a641b" />
Perdeu o Segredo da API? Você precisa deletar a chave de API no ícone de lixeira e gerar uma nova para ter acesso a um novo segredo.

### Configurando a chave no seu Agente de IA

Cada agente ou cliente de IA tem uma forma diferente de receber e armazenar chaves de API. Converse com o agente que você utiliza e garanta que suas credenciais estão registradas de forma segura (variáveis de ambiente, cofre de segredos, etc.).

**Os desenvolvedores deste MCP não se responsabilizam pela etapa de configuração de credenciais no seu agente de IA.** A segurança das suas chaves é de sua inteira responsabilidade.

### Como funciona internamente

- O MCP usa suas credenciais para obter um **token Bearer** (válido por ~1 hora)
- O token é **renovado automaticamente** antes de expirar
- Suas credenciais **nunca são expostas** nas chamadas de ferramentas — apenas o token temporário é utilizado
- Todas as credenciais são passadas via **variáveis de ambiente** (nunca em código)

### Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
| -------- | :---------: | :----: | --------- |
| `MB_API_KEY` | Para operações autenticadas | — | Client ID (Chave de API) do Mercado Bitcoin |
| `MB_API_SECRET` | Para operações autenticadas | — | Client Secret (Segredo da API) do Mercado Bitcoin |
| `MB_OPERATION_MODE` | Não | `trading` | Modo de operação: `readonly`, `trading` ou `full` |
| `MB_AUTO_CONFIRM` | Não | `false` | Pular confirmação em operações perigosas |
| `MB_MAX_ORDER_BRL` | Não | sem limite | Valor máximo por ordem (em BRL) |
| `MB_DAILY_LIMIT_BRL` | Não | sem limite | Limite diário de negociação (em BRL) |
| `MB_DRY_RUN` | Não | `false` | Modo simulação (não executa operações reais) |

---

## Instalação

```bash
npm install -g mcp-mercado-bitcoin
```

Ou execute diretamente sem instalar:

```bash
npx mcp-mercado-bitcoin
```

---

## Configuração por Cliente

### Claude Desktop App (Claude Cowork / Chat)

O Claude Desktop utiliza um arquivo de configuração JSON. Localize-o em:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Adicione o bloco abaixo dentro do arquivo:

```json
{
  "mcpServers": {
    "mercado-bitcoin": {
      "command": "npx",
      "args": ["mcp-mercado-bitcoin"],
      "env": {
        "MB_API_KEY": "seu_client_id_aqui",
        "MB_API_SECRET": "seu_client_secret_aqui",
        "MB_OPERATION_MODE": "trading",
        "MB_MAX_ORDER_BRL": "1000",
        "MB_DAILY_LIMIT_BRL": "5000",
        "MB_DRY_RUN": "false"
      }
    }
  }
}
```

Após salvar, **reinicie completamente** o Claude Desktop (feche e abra novamente).

### Claude Code (Terminal)

No terminal, execute:

```bash
claude mcp add \
  --transport stdio \
  -e MB_API_KEY=seu_client_id_aqui \
  -e MB_API_SECRET=seu_client_secret_aqui \
  -e MB_OPERATION_MODE=trading \
  -e MB_MAX_ORDER_BRL=1000 \
  -e MB_DAILY_LIMIT_BRL=5000 \
  mcp-mercado-bitcoin -- npx mcp-mercado-bitcoin
```

Para verificar se o servidor está conectado:

```bash
claude mcp list
```

Dentro de uma sessão do Claude Code, use `/mcp` para verificar o status.

### OpenClaw

No arquivo de configuração do OpenClaw (`openclaw.config.json` ou equivalente), adicione:

```json
{
  "mcpServers": {
    "mercado-bitcoin": {
      "transport": "stdio",
      "command": "npx",
      "args": ["mcp-mercado-bitcoin"],
      "env": {
        "MB_API_KEY": "seu_client_id_aqui",
        "MB_API_SECRET": "seu_client_secret_aqui",
        "MB_OPERATION_MODE": "trading",
        "MB_MAX_ORDER_BRL": "1000",
        "MB_DAILY_LIMIT_BRL": "5000"
      }
    }
  }
}
```

### Outros clientes MCP (Cursor, VS Code, etc.)

Use o transporte **stdio** com o comando `npx mcp-mercado-bitcoin` e passe as credenciais via variáveis de ambiente. Consulte a documentação do seu cliente MCP para o formato exato de configuração.

---

## Ferramentas Disponíveis

### Status e Utilidade

| Ferramenta | Descrição |
| ---------- | --------- |
| `mb_status` | Exibe a configuração atual do servidor: modo de operação, status de autenticação, limites de gasto configurados e valor já negociado no dia |

### Dados Públicos (sem autenticação)

Estas ferramentas acessam dados abertos do Mercado Bitcoin. Não requerem chave de API.

| Ferramenta | Descrição |
| ---------- | --------- |
| `mb_get_orderbook` | Livro de ofertas (ordens de compra e venda) de um par de negociação. Mostra preços e quantidades em cada nível |
| `mb_get_trades` | Histórico de negociações executadas recentemente. Útil para ver atividade de mercado e preços praticados |
| `mb_get_symbols` | Lista pares de negociação com metadados (tipo de ativo, preços, volumes). Por padrão retorna apenas pares BRL em páginas de 200. Suporta paginação e filtro por símbolo específico |
| `mb_get_tickers` | Cotações atuais: último preço, melhor compra, melhor venda, máxima, mínima, abertura e volume 24h |
| `mb_get_candles` | Dados OHLCV (abertura, máxima, mínima, fechamento, volume) para gráficos e análise técnica. Resoluções: 1m, 15m, 1h, 3h, 1d, 1w, 1M |
| `mb_get_asset_fees` | Taxas de depósito e saque por ativo, incluindo mínimos e confirmações necessárias por rede blockchain |
| `mb_get_asset_networks` | Redes blockchain disponíveis para um ativo (ex: USDT pode ser sacado via Ethereum, Stellar, etc.) |

### Conta (requer autenticação)

Ferramentas de consulta da sua conta. Requerem `MB_API_KEY` e `MB_API_SECRET`.

| Ferramenta | Descrição |
| ---------- | --------- |
| `mb_list_accounts` | Lista todas as suas contas/carteiras no Mercado Bitcoin. Retorna IDs necessários para outras operações |
| `mb_get_balances` | Saldos dos seus ativos: disponível, em ordens abertas (bloqueado) e total. Por padrão exibe apenas ativos com saldo |
| `mb_get_tier` | Nível de tier da conta — níveis mais altos possuem taxas de negociação menores |
| `mb_get_trading_fees` | Taxas de maker (quem coloca ordem no livro) e taker (quem executa ordem existente) para um par específico |
| `mb_get_positions` | Posições abertas com preço médio de entrada, quantidade e lado (compra/venda). Útil para análise de portfólio e P&L |
| `mb_internal_transfer` | Transferência de ativos entre suas próprias sub-contas no Mercado Bitcoin. **Requer confirmação** |

### Negociação (requer autenticação + modo `trading` ou `full`)

Ferramentas de negociação. **Todas as operações que movem dinheiro passam pelo fluxo de confirmação em dois passos.**

| Ferramenta | Descrição |
| ---------- | --------- |
| `mb_place_order` | Cria uma ordem de compra ou venda. Aceita valor em reais (`cost`, ex: "compre R$ 500 de BTC") ou quantidade (`qty`, ex: "compre 3 unidades"). Tipos: `market`, `limit`, `stoplimit` e `post-only`. **Requer confirmação** |
| `mb_list_orders` | Lista ordens de um par específico com filtros: status, lado (compra/venda), período |
| `mb_get_order` | Detalhes completos de uma ordem: execuções parciais (fills), preço médio, taxas cobradas |
| `mb_cancel_order` | Cancela uma ordem aberta específica. **Requer confirmação** |
| `mb_cancel_all_orders` | Cancela TODAS as ordens abertas da conta (opcionalmente filtradas por par). **Operação perigosa — requer confirmação** |
| `mb_list_all_orders` | Lista ordens em TODOS os pares de negociação da conta |

### Carteira (requer autenticação + modo `full`)

Ferramentas de gestão de carteira, depósitos e saques. **Disponíveis apenas no modo `full`.**

| Ferramenta | Descrição |
| ---------- | --------- |
| `mb_create_account` | Cria uma nova sub-conta (carteira) para separar fundos por estratégia. **Requer confirmação** |
| `mb_list_deposits` | Histórico de depósitos de criptoativos: valores, confirmações, status, IDs de transação |
| `mb_get_deposit_addresses` | Endereços para receber depósitos de criptoativos, incluindo QR codes. Especifique a rede para ativos multi-rede |
| `mb_list_fiat_deposits` | Histórico de depósitos em BRL via PIX: valores, status, banco de origem |
| `mb_withdraw` | Saque de criptoativos ou BRL. **Operação de mais alto risco.** Apenas para endereços/contas pré-cadastrados como "confiáveis" no Mercado Bitcoin. **Requer confirmação** |
| `mb_list_withdrawals` | Histórico de saques: valores, status (aberto/concluído/cancelado), destinos |
| `mb_get_withdrawal` | Detalhes de um saque específico por ID |
| `mb_get_withdraw_limits` | Limites de saque por ativo |
| `mb_get_brl_withdraw_config` | Configuração de saque em BRL: limites mínimo/máximo, limite utilizado e estrutura de taxas |
| `mb_list_withdraw_addresses` | Lista de endereços crypto pré-cadastrados como "confiáveis" para saques |
| `mb_list_bank_accounts` | Lista de contas bancárias pré-cadastradas para saques em BRL |

---

## Casos de Uso

### 1. Monitoramento de Portfólio

> "Qual é meu saldo atual? Quanto tenho de Bitcoin e Ethereum?"

A IA usa `mb_list_accounts` para encontrar seu ID de conta, depois `mb_get_balances` para listar todos os saldos. Combina com `mb_get_tickers` para calcular o valor total em BRL.

### 2. Consulta de Preços e Mercado

> "Qual o preço atual do Bitcoin? Como ele variou nos últimos 7 dias?"

A IA usa `mb_get_tickers` para o preço atual e `mb_get_candles` com resolução diária para o histórico. Pode analisar tendências, suportes e resistências.

### 3. Compra por Valor em Reais

> "Compre R$ 500 de Solana a mercado"

A IA usa `mb_place_order` com `cost=500`. O MCP consulta a cotação atual, calcula a quantidade equivalente e mostra a prévia:

```text
CONFIRMAÇÃO NECESSÁRIA: Criar Ordem
  Símbolo: SOL-BRL
  Lado: COMPRA
  Tipo: market
  Custo: R$ 500,00
  Preço ask usado: R$ 812,50
  Qtd calculada: 0.61538461
  AVISO: O preço pode variar entre esta prévia e a execução (slippage)

Para prosseguir, confirme a operação.
```

Somente após sua aprovação a ordem é executada.

### 4. Compra por Quantidade

> "Compre 3 unidades da Renda Fixa Digital RFDB11-BRL"

A IA usa `mb_place_order` com `qty=3`. Ideal para ativos que fazem mais sentido em unidades inteiras, como Renda Fixa Digital, Renda Variável Digital e Fan Tokens.

### 5. Venda com Limite de Preço

> "Coloque uma ordem de venda de 0.01 BTC a R$ 350.000"

A IA usa `mb_place_order` com `type=limit`, `side=sell`, `qty=0.01`, `limitPrice=350000`. A ordem ficará no livro até ser executada ou cancelada.

### 6. Acompanhamento de Ordens

> "Quais são minhas ordens abertas?"

A IA usa `mb_list_all_orders` com `status=working` para listar todas as ordens pendentes em todos os pares.

### 7. Gestão de Risco por Agente Autônomo

Um agente OpenClaw ou Claude Code pode ser configurado para:

- Monitorar preços periodicamente via `mb_get_tickers`
- Colocar ordens de compra quando um ativo atinge um preço alvo
- Cancelar ordens que não foram executadas após certo tempo
- Respeitar limites configurados em `MB_MAX_ORDER_BRL` e `MB_DAILY_LIMIT_BRL`

### 8. Consulta de Taxas Antes de Operar

> "Quais as taxas para negociar ETH-BRL e para sacar ETH?"

A IA usa `mb_get_trading_fees` para taxas de negociação (maker/taker) e `mb_get_asset_fees` para taxas de saque por rede.

---

## Desenvolvimento

```bash
git clone https://github.com/RodrigoFlorencio86/mcp-mercado-bitcoin.git
cd mcp-mercado-bitcoin
npm install
npm run build
```

Testar com o MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

---

## Aviso Final

Este projeto é **independente** e **não possui vínculo, endosso ou afiliação com o Mercado Bitcoin**. O nome "Mercado Bitcoin" é utilizado apenas para identificar a plataforma com a qual o MCP se integra.

O uso deste software implica na **aceitação integral** de todos os riscos descritos neste documento. Você é o **único responsável** por suas decisões de investimento e pelo uso que faz desta ferramenta.

**DYOR — Faça sua própria pesquisa. Invista com responsabilidade.**

---

## Licença

MIT — veja o arquivo [LICENSE](LICENSE) para detalhes.
