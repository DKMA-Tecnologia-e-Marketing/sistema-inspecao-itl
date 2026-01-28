# 📋 Guia Completo: Como Gerar um Laudo de Inspeção

Este documento explica passo a passo como gerar um laudo de inspeção no sistema.

## 🔐 Passo 1: Fazer Login

1. Acesse `http://localhost:5005/login`
2. Preencha suas credenciais:
   - **E-mail:** `operador@itl.com.br` (ou seu e-mail de operador)
   - **Senha:** Sua senha de operador
3. Clique no botão **"Entrar"**

---

## 📍 Passo 2: Acessar a Página de Inspeções

1. Após o login, você será redirecionado para o dashboard
2. No menu lateral, clique em **"Inspeções"** (ícone de clipboard)
3. Você verá a lista de todas as inspeções do seu estabelecimento

---

## 🔍 Passo 3: Localizar uma Inspeção

Na tabela de inspeções, você verá:
- **ID** da inspeção
- **Data/Hora** do agendamento
- **Cliente** (nome)
- **Veículo** (placa)
- **Status** (pendente, confirmado, realizado, cancelado)
- **Ações** (botões disponíveis)

Para gerar um laudo, você precisa de uma inspeção com status **"pendente"** ou **"confirmado"**.

---

## 🚀 Passo 4: Abrir o Modal "Gerar Laudo"

1. Na linha da inspeção desejada, localize a coluna **"Ações"**
2. Clique no botão **"Gerar Laudo"**
3. Um modal será aberto com o título **"Gerar Laudo de Inspeção"**

---

## 📝 Passo 5: Preencher os Campos do Modal

O modal contém os seguintes campos:

### 5.1 Número do Laudo (Automático)
- ✅ **Campo gerado automaticamente** quando o modal abre
- ✅ **Campo somente leitura** (não pode ser editado)
- O número segue o formato: `001/2026` (número sequencial/ano)

### 5.2 Órgão *
- **Campo obrigatório**
- Selecione o órgão responsável pela inspeção
- Clique no dropdown e escolha uma opção

### 5.3 Inspetor Técnico *
- **Campo obrigatório**
- Selecione o inspetor técnico que realizará a inspeção
- Ao selecionar, os dados do inspetor (nome, CPF, CFT) são preenchidos automaticamente

### 5.4 Responsável Técnico *
- **Campo obrigatório**
- Selecione o responsável técnico
- Ao selecionar, os dados do responsável (nome, CPF, CREA) são preenchidos automaticamente

### 5.5 Data de Validade *
- **Campo obrigatório**
- Selecione a data de validade do laudo
- Use o seletor de data (calendário)

---

## 📸 Passo 6: Fazer Upload das Fotos Obrigatórias

Na seção **"Fotos Obrigatórias"**, você precisa fazer upload de **4 fotos**:

1. **Traseira** - Foto traseira do veículo
2. **Dianteira** - Foto dianteira do veículo
3. **Placa** - Foto da placa do veículo
4. **Panorâmica** - Foto panorâmica do veículo

### Como fazer upload:
1. Clique no botão **"Escolher arquivo"** ou **"Selecionar foto"** abaixo de cada tipo
2. Selecione uma imagem do seu computador
3. A imagem será exibida como preview
4. Repita o processo para todas as 4 fotos obrigatórias

### Requisitos das fotos:
- ✅ Formato: JPG, PNG ou similar
- ✅ Tamanho máximo: 10MB por foto
- ✅ Todas as 4 fotos são obrigatórias

---

## ✅ Passo 7: Gerar o Laudo

1. Verifique se todos os campos obrigatórios foram preenchidos:
   - ✅ Número do Laudo (automático)
   - ✅ Órgão selecionado
   - ✅ Inspetor Técnico selecionado
   - ✅ Responsável Técnico selecionado
   - ✅ Data de Validade preenchida
   - ✅ 4 fotos obrigatórias enviadas

2. Clique no botão **"Gerar Laudo"** no rodapé do modal

3. O sistema irá:
   - Criar o registro do laudo no banco de dados
   - Fazer upload das fotos para o servidor
   - Gerar o PDF do laudo
   - Exibir uma mensagem de sucesso

---

## 📄 Passo 8: Visualizar o Laudo Gerado

Após a geração bem-sucedida:

1. O modal será fechado automaticamente
2. Uma notificação de sucesso será exibida
3. Na tabela de inspeções, o status pode ser atualizado
4. Você pode visualizar ou baixar o PDF do laudo através das ações disponíveis

---

## ⚠️ Observações Importantes

### Campos Obrigatórios:
- Todos os campos marcados com `*` são obrigatórios
- O sistema não permitirá gerar o laudo se algum campo obrigatório estiver vazio

### Fotos:
- **Todas as 4 fotos são obrigatórias** (traseira, dianteira, placa, panorâmica)
- O sistema validará se todas as fotos foram enviadas antes de gerar o laudo

### Número do Laudo:
- O número é gerado automaticamente e não pode ser editado
- O número é único e sequencial por órgão e ano

### Técnicos:
- Certifique-se de que os técnicos (Inspetor e Responsável) estão cadastrados no sistema
- Acesse **"Sistema" > "Técnicos"** para gerenciar os cadastros

---

## 🔧 Resolução de Problemas

### "Nenhum tipo de inspeção configurado"
- Acesse **"Precificação"** no menu lateral
- Configure os tipos de inspeção disponíveis para seu estabelecimento

### "Nenhum técnico disponível"
- Acesse **"Sistema" > "Técnicos"**
- Cadastre os técnicos necessários (Inspetor Técnico e Responsável Técnico)

### "Erro ao fazer upload das fotos"
- Verifique o tamanho do arquivo (máximo 10MB)
- Verifique o formato da imagem (JPG, PNG)
- Tente fazer upload novamente

### "Número do laudo não foi gerado"
- Verifique se há um órgão selecionado
- Recarregue a página e tente novamente

---

## 📞 Suporte

Se encontrar problemas ao gerar o laudo, entre em contato com o administrador do sistema.

---

**Última atualização:** 22/01/2026



