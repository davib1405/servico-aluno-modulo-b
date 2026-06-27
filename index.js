require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { apiReference } = require('@scalar/express-api-reference');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ==============================================================
// ESPECIFICAÇÃO DA API (OPENAPI 3.0)
// ==============================================================
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Web 3 - 2026 (Módulo B)",
    version: "1.0.0",
    description: "Serviço do Aluno — Gerenciamento Avançado de Atividades Complementares."
  },
  tags: [
    { name: "Health", description: "Verificação de integridade" },
    { name: "Atividades", description: "Gerenciamento do ciclo de vida das atividades" }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Insira o token JWT válido para liberar os testes dos endpoints."
      }
    },
    schemas: {
      Atividade: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          alunoId: { type: "integer" },
          titulo: { type: "string" },
          descricao: { type: "string", nullable: true },
          cargaHorariaPrevista: { type: "integer" },
          cargaHorariaReal: { type: "integer", nullable: true },
          pdfVinculo: { type: "string" },
          pdfCertificado: { type: "string", nullable: true },
          status: { type: "string" },
          ativo: { type: "boolean" },
          criadoEm: { type: "string", format: "date-time" },
          atualizadoEm: { type: "string", format: "date-time" }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Status do serviço",
        responses: {
          "200": {
            description: "Operacional",
            content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" } } } } }
          }
        }
      }
    },
    "/atividades": {
      post: {
        tags: ["Atividades"],
        summary: "Cadastrar uma nova atividade",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["titulo", "cargaHorariaPrevista", "pdfVinculo"],
                properties: {
                  titulo: { type: "string", example: "Monitoria de Programação" },
                  descricao: { type: "string", example: "Auxílio aos alunos do primeiro período." },
                  cargaHorariaPrevista: { type: "integer", example: 40 },
                  pdfVinculo: { type: "string", example: "JVBERi0xLjQKJcO..." }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Sucesso",
            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, atividade: { $ref: "#/components/schemas/Atividade" } } } } }
          }
        }
      },
      get: {
        tags: ["Atividades"],
        summary: "Listar atividades cadastradas",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Sucesso",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Atividade" } } } }
          }
        }
      }
    },
    "/atividades/{id}/finalizar": {
      post: {
        tags: ["Atividades"],
        summary: "Enviar certificado final",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["cargaHorariaReal", "pdfCertificado"],
                properties: {
                  cargaHorariaReal: { type: "integer", example: 45 },
                  pdfCertificado: { type: "string", example: "JVBERi0xLjQKJcO..." }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Sucesso",
            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, atividade: { $ref: "#/components/schemas/Atividade" } } } } }
          }
        }
      }
    },
    "/atividades/{id}": {
      delete: {
        tags: ["Atividades"],
        summary: "Desativar uma atividade",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Sucesso"
          }
        }
      }
    }
  }
};

// Interface gráfica do Scalar configurada em modo escuro nativo e moderno
app.use('/docs', apiReference({
  theme: 'purple',
  spec: { content: swaggerDocument }
}));

// ==============================================================
// MIDDLEWARE DE AUTENTICAÇÃO (MOCKADO)
// ==============================================================
const validarAutenticacao = async (req, res, next) => {
  req.alunoId = 1; 
  next();
};

// ==============================================================
// EXECUÇÃO DAS ROTAS
// ==============================================================
app.get('/health', (req, res) => {
  res.json({ status: 'Módulo B está rodando perfeitamente!' });
});

app.post('/atividades', validarAutenticacao, async (req, res) => {
  try {
    const { titulo, descricao, cargaHorariaPrevista, pdfVinculo } = req.body;
    const novaAtividade = await prisma.atividade.create({
      data: { alunoId: req.alunoId, titulo, descricao, cargaHorariaPrevista, pdfVinculo }
    });
    res.status(201).json({ message: 'Consulta prévia registrada com sucesso!', atividade: novaAtividade });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar atividade.' });
  }
});

app.get('/atividades', validarAutenticacao, async (req, res) => {
  try {
    const atividades = await prisma.atividade.findMany({
      where: { alunoId: req.alunoId, ativo: true }
    });
    res.json(atividades);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar atividades.' });
  }
});

app.post('/atividades/:id/finalizar', validarAutenticacao, async (req, res) => {
  try {
    const { id } = req.params;
    const { cargaHorariaReal, pdfCertificado } = req.body;
    const atividadeAtualizada = await prisma.atividade.update({
      where: { id: id, alunoId: req.alunoId },
      data: { cargaHorariaReal, pdfCertificado, status: 'AGUARDANDO_COMISSAO' }
    });
    res.json({ message: 'Solicitação de integralização enviada!', atividade: atividadeAtualizada });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar integralização.' });
  }
});

app.delete('/atividades/:id', validarAutenticacao, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.atividade.update({
      where: { id: id, alunoId: req.alunoId },
      data: { ativo: false }
    });
    res.json({ message: 'Atividade desativada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao desativar atividade.' });
  }
});

const PORTA = process.env.PORT || 3001;
app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});