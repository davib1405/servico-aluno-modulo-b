require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
// Limite aumentado para 50mb para aguentar os PDFs convertidos em Base64
app.use(express.json({ limit: '50mb' })); 

// ==============================================================
// 1. (O MASHUP COM O MÓDULO A)
// ==============================================================

const validarAutenticacao = async (req, res, next) => {
  console.log("⚠️ SIMULAÇÃO ATIVADA: Ignorando o Módulo A e aprovando o aluno direto.");
  
  // Vamos fingir que o token deu certo e o aluno logado tem o ID 1
  req.alunoId = 1; 
  
  next(); // Libera o acesso para a rota salvar a atividade no banco de dados!
};

// ==============================================================
// 2. ROTAS DO SERVIÇO DO ALUNO (MÓDULO B)
// ==============================================================

// Rota de Teste Simples
app.get('/health', (req, res) => {
  res.json({ status: 'Módulo B está rodando perfeitamente!' });
});

// A. Consulta Prévia (Cadastrar o início de uma ação)
app.post('/atividades', validarAutenticacao, async (req, res) => {
  try {
    const { titulo, descricao, cargaHorariaPrevista, pdfVinculo } = req.body;
    
    const novaAtividade = await prisma.atividade.create({
      data: {
        alunoId: req.alunoId,
        titulo,
        descricao,
        cargaHorariaPrevista,
        pdfVinculo // Aqui salva o PDF em Base64
      }
    });

    res.status(201).json({ message: 'Consulta prévia registrada com sucesso!', atividade: novaAtividade });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar atividade.' });
  }
});

// B. Listar as atividades do aluno logado (Controle de Estado)
app.get('/atividades', validarAutenticacao, async (req, res) => {
  try {
    const atividades = await prisma.atividade.findMany({
      where: { 
        alunoId: req.alunoId,
        ativo: true // Só mostra as que não foram excluídas logicamente
      }
    });
    res.json(atividades);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar atividades.' });
  }
});

// C. Solicitação de Integralização (A grande jogada)
app.post('/atividades/:id/finalizar', validarAutenticacao, async (req, res) => {
  try {
    const { id } = req.params;
    const { cargaHorariaReal, pdfCertificado } = req.body;

    const atividadeAtualizada = await prisma.atividade.update({
      where: { id: id, alunoId: req.alunoId }, // Garante que só o dono altera
      data: {
        cargaHorariaReal,
        pdfCertificado,
        status: 'AGUARDANDO_COMISSAO' // Altera o estado
      }
    });

    res.json({ message: 'Solicitação de integralização enviada!', atividade: atividadeAtualizada });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar integralização.' });
  }
});

// D. Exclusão Lógica (Requisito do professor)
app.delete('/atividades/:id', validarAutenticacao, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.atividade.update({
      where: { id: id, alunoId: req.alunoId },
      data: { ativo: false } // Apenas esconde, não deleta do banco!
    });

    res.json({ message: 'Atividade desativada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao desativar atividade.' });
  }
});

// ==============================================================
// 3. INICIAR O SERVIDOR
// ==============================================================
const PORTA = process.env.PORT || 3001;
app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando lindamente na porta ${PORTA}`);
});