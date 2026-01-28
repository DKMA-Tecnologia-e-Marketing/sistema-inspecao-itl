# 🎬 Fluxo Visual Completo: Como Gerar um Laudo de Inspeção

Este guia mostra **passo a passo** como gerar um laudo de inspeção no sistema.

---

## 📋 **PASSO 1: Fazer Login**

1. Acesse: `http://localhost:5005/login`
2. Preencha:
   - **E-mail:** `operador@itl.com.br` (ou seu e-mail de operador)
   - **Senha:** Sua senha de operador
3. Clique em **"Entrar"**

**O que você verá:**
- Página de login com campos de e-mail e senha
- Botão "Entrar" com gradiente azul/roxo

---

## 📍 **PASSO 2: Acessar a Página de Inspeções**

1. Após o login, você será redirecionado para o dashboard
2. No **menu lateral esquerdo**, procure a seção **"OPERACIONAL"**
3. Clique em **"Inspeções"** (ícone de clipboard 📋)

**O que você verá:**
- Menu lateral com várias opções
- Seção "OPERACIONAL" com "Inspeções" destacada
- Página principal com título "Inspeções"

---

## 🔍 **PASSO 3: Localizar uma Inspeção**

Na página de Inspeções, você verá:

- **Tabela com colunas:**
  - ID
  - Data/Hora
  - Cliente
  - Veículo
  - Status
  - Ações

**Para gerar um laudo:**
- Procure uma inspeção com status **"pendente"** ou **"confirmado"**
- Na coluna **"Ações"**, você verá o botão **"Gerar Laudo"**

**O que você verá:**
- Lista de inspeções em formato de tabela
- Botão "Gerar Laudo" na última coluna de cada linha

---

## 🚀 **PASSO 4: Abrir o Modal "Gerar Laudo"**

1. Na linha da inspeção desejada, localize a coluna **"Ações"**
2. Clique no botão **"Gerar Laudo"**
3. Um **modal grande** será aberto no centro da tela

**O que você verá:**
- Modal com título **"Gerar Laudo de Inspeção"**
- Descrição: "Preencha os dados e anexe as 4 fotos obrigatórias para gerar o laudo"
- Vários campos para preencher

---

## 📝 **PASSO 5: Preencher os Campos do Modal**

O modal contém os seguintes campos (na ordem de cima para baixo):

### ✅ **5.1 Número do Laudo** (Automático - Não precisa fazer nada)
- **Campo gerado automaticamente** quando o modal abre
- **Campo somente leitura** (cinza, não pode editar)
- Formato: `001/2026` (número sequencial/ano)
- **Você não precisa fazer nada aqui!**

### 📋 **5.2 Órgão *** (Obrigatório)
- **Campo dropdown** (caixa de seleção)
- Clique no campo para abrir as opções
- Selecione um órgão da lista (ex: INMETRO, DETRAN, etc.)
- **Você DEVE selecionar um órgão**

### 👤 **5.3 Inspetor Técnico *** (Obrigatório)
- **Campo dropdown** (caixa de seleção)
- Clique no campo para abrir as opções
- Selecione um inspetor técnico da lista
- **Ao selecionar, os dados são preenchidos automaticamente:**
  - Nome completo
  - CPF
  - CFT
- **Você DEVE selecionar um inspetor**

### 👨‍💼 **5.4 Responsável Técnico *** (Obrigatório)
- **Campo dropdown** (caixa de seleção)
- Clique no campo para abrir as opções
- Selecione um responsável técnico da lista
- **Ao selecionar, os dados são preenchidos automaticamente:**
  - Nome completo
  - CPF
  - CREA
- **Você DEVE selecionar um responsável**

### 📅 **5.5 Data de Validade *** (Obrigatório)
- **Campo de data** (calendário)
- Clique no campo para abrir o calendário
- Selecione uma data futura (geralmente 1 ano a partir de hoje)
- **Você DEVE selecionar uma data**

**O que você verá:**
- Campos organizados em um formulário
- Campos obrigatórios marcados com `*`
- Dropdowns que abrem ao clicar
- Calendário para seleção de data

---

## 📸 **PASSO 6: Fazer Upload das Fotos Obrigatórias**

Abaixo dos campos, há uma seção chamada **"Fotos Obrigatórias"**.

**Você precisa fazer upload de 4 fotos:**

### 📷 **6.1 Foto Traseira**
1. Clique no botão **"Escolher arquivo"** ou **"Selecionar foto"** abaixo de "Traseira"
2. Selecione uma imagem do seu computador
3. A imagem será exibida como preview (miniatura)

### 📷 **6.2 Foto Dianteira**
1. Clique no botão **"Escolher arquivo"** abaixo de "Dianteira"
2. Selecione uma imagem do seu computador
3. A imagem será exibida como preview

### 📷 **6.3 Foto Placa**
1. Clique no botão **"Escolher arquivo"** abaixo de "Placa"
2. Selecione uma imagem do seu computador
3. A imagem será exibida como preview

### 📷 **6.4 Foto Panorâmica**
1. Clique no botão **"Escolher arquivo"** abaixo de "Panorâmica"
2. Selecione uma imagem do seu computador
3. A imagem será exibida como preview

**Requisitos das fotos:**
- ✅ Formato: JPG, PNG ou similar
- ✅ Tamanho máximo: 10MB por foto
- ✅ **TODAS as 4 fotos são obrigatórias**

**O que você verá:**
- 4 campos de upload organizados em uma grade (2x2)
- Cada campo tem um label (Traseira, Dianteira, Placa, Panorâmica)
- Botão "Escolher arquivo" ou similar em cada campo
- Preview da imagem após selecionar

---

## ✅ **PASSO 7: Verificar e Gerar o Laudo**

Antes de clicar em "Gerar Laudo", verifique se:

- ✅ **Número do Laudo** está preenchido (automático)
- ✅ **Órgão** está selecionado
- ✅ **Inspetor Técnico** está selecionado
- ✅ **Responsável Técnico** está selecionado
- ✅ **Data de Validade** está preenchida
- ✅ **4 fotos obrigatórias** foram enviadas (todas com preview)

**Se todos os campos estiverem preenchidos:**

1. Role a página para baixo (se necessário)
2. No **rodapé do modal**, você verá dois botões:
   - **"Cancelar"** (à esquerda)
   - **"Gerar Laudo"** (à direita, destacado)
3. Clique no botão **"Gerar Laudo"**

**O que acontece:**
- O sistema valida todos os campos
- Cria o registro do laudo no banco de dados
- Faz upload das fotos para o servidor
- Gera o PDF do laudo
- Exibe uma mensagem de sucesso (toast/notificação)
- O modal fecha automaticamente

**O que você verá:**
- Botão "Gerar Laudo" destacado (azul/roxo)
- Botão pode estar desabilitado (cinza) se faltar algum campo
- Mensagem de sucesso após gerar
- Modal fecha automaticamente

---

## 📄 **PASSO 8: Resultado**

Após a geração bem-sucedida:

1. ✅ **Notificação de sucesso** aparece no canto da tela
2. ✅ **Modal fecha automaticamente**
3. ✅ **Tabela de inspeções é atualizada**
4. ✅ **Status da inspeção pode mudar**

**Para visualizar o laudo gerado:**
- Na tabela de inspeções, procure a inspeção
- Pode haver um botão para **"Visualizar Laudo"** ou **"Baixar PDF"**
- Clique para ver ou baixar o PDF do laudo

---

## ⚠️ **PROBLEMAS COMUNS E SOLUÇÕES**

### ❌ "Número do laudo não foi gerado"
**Solução:** Selecione um órgão primeiro. O número é gerado automaticamente após selecionar o órgão.

### ❌ "Nenhum inspetor/responsável disponível"
**Solução:** 
1. Acesse **"Sistema" > "Técnicos"** no menu lateral
2. Cadastre os técnicos necessários
3. Volte para gerar o laudo

### ❌ "Erro ao fazer upload das fotos"
**Solução:**
- Verifique o tamanho do arquivo (máximo 10MB)
- Verifique o formato (JPG, PNG)
- Tente fazer upload novamente

### ❌ "Botão Gerar Laudo está desabilitado"
**Solução:** Verifique se todos os campos obrigatórios estão preenchidos:
- Órgão selecionado
- Inspetor Técnico selecionado
- Responsável Técnico selecionado
- Data de Validade preenchida
- 4 fotos obrigatórias enviadas

---

## 🎯 **RESUMO RÁPIDO**

1. **Login** → Acesse o sistema
2. **Inspeções** → Vá para a página de inspeções
3. **Gerar Laudo** → Clique no botão na linha da inspeção
4. **Preencher** → Preencha todos os campos obrigatórios
5. **Fotos** → Faça upload das 4 fotos obrigatórias
6. **Gerar** → Clique em "Gerar Laudo"
7. **Pronto!** → Laudo gerado com sucesso!

---

**💡 Dica:** Se você tiver dúvidas, siga este guia passo a passo. Cada campo tem uma função específica e todos são necessários para gerar o laudo corretamente.

**Última atualização:** 22/01/2026



