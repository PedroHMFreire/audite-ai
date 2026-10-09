-- Migration: Add 'diferenca' column to results table
-- Date: 2026-03-05
-- Description: Adiciona coluna para armazenar diferença absoluta entre esperado e encontrado
--              Necessária para cálculos corrigidos de contagem

BEGIN;

-- Adiciona coluna diferenca se não existir
ALTER TABLE results
ADD COLUMN IF NOT EXISTS diferenca INTEGER DEFAULT 0;

-- Cria índice para performance em queries de diferença
CREATE INDEX IF NOT EXISTS idx_results_diferenca 
  ON results(count_id, status, diferenca);

-- Atualiza valores existentes (cálculo retroativo)
UPDATE results
SET diferenca = ABS(saldo_qtd - manual_qtd)
WHERE diferenca = 0 AND (saldo_qtd != manual_qtd OR saldo_qtd = 0);

COMMIT;
