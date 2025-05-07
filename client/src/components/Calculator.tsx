import React, { useEffect, useRef } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { X, Delete, CheckCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const Calculator: React.FC = () => {
  const { 
    calculatorOpen, 
    closeCalculator, 
    applyCalculatorResult,
    calculatorExpression,
    calculatorResult,
    handleCalculatorAction
  } = useWizard();
  
  const calculatorRef = useRef<HTMLDivElement>(null);
  
  // Adicionar suporte ao teclado físico
  useEffect(() => {
    if (!calculatorOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Números
      if (/^[0-9]$/.test(e.key)) {
        handleCalculatorAction('number', e.key);
      }
      // Operadores
      else if (['+', 'Enter'].includes(e.key)) {
        handleCalculatorAction('add');
      }
      // Backspace
      else if (e.key === 'Backspace') {
        handleCalculatorAction('backspace');
      }
      // Limpar
      else if (e.key === 'Escape') {
        closeCalculator();
      }
      // Confirmar
      else if (e.key === 'Enter' && e.ctrlKey) {
        applyCalculatorResult();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [calculatorOpen, handleCalculatorAction, closeCalculator, applyCalculatorResult]);
  
  if (!calculatorOpen) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300",
        calculatorOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      ref={calculatorRef}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden transform transition-all">
        <div className="bg-primary-500 px-4 py-3 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Calculadora de Adição</h3>
          <button 
            className="text-white hover:text-gray-200 focus:outline-none"
            onClick={closeCalculator}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Calculator display */}
          <div className="bg-gray-100 border border-gray-300 rounded-md p-3 mb-4">
            <div className="text-sm text-gray-600 mb-1">{calculatorExpression}</div>
            <div className="text-2xl font-medium text-gray-900 text-right">{calculatorResult}</div>
          </div>
          
          {/* Calculator grid - Redesenhada conforme os novos requisitos */}
          <div className="calculator-grid grid grid-cols-4 gap-2">
            {/* Row 1 */}
            <button 
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded"
              onClick={() => handleCalculatorAction('clear')}
            >
              C
            </button>
            <button 
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded"
              onClick={() => handleCalculatorAction('backspace')}
            >
              <Delete className="h-4 w-4 mx-auto" />
            </button>
            <button 
              className="bg-white hover:bg-gray-100 invisible"
            >
            </button>
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded"
              onClick={() => handleCalculatorAction('add')}
            >
              <div className="flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
            </button>
            
            {/* Row 2 */}
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
              onClick={() => handleCalculatorAction('number', '7')}
            >
              7
            </button>
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
              onClick={() => handleCalculatorAction('number', '8')}
            >
              8
            </button>
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
              onClick={() => handleCalculatorAction('number', '9')}
            >
              9
            </button>
            <button 
              className="bg-white hover:bg-gray-100 invisible"
            >
            </button>
            
            {/* Row 3 */}
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
              onClick={() => handleCalculatorAction('number', '4')}
            >
              4
            </button>
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
              onClick={() => handleCalculatorAction('number', '5')}
            >
              5
            </button>
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
              onClick={() => handleCalculatorAction('number', '6')}
            >
              6
            </button>
            <button 
              className="bg-white hover:bg-gray-100 invisible"
            >
            </button>
            
            {/* Row 4 */}
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
              onClick={() => handleCalculatorAction('number', '1')}
            >
              1
            </button>
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
              onClick={() => handleCalculatorAction('number', '2')}
            >
              2
            </button>
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
              onClick={() => handleCalculatorAction('number', '3')}
            >
              3
            </button>
            <button 
              className="bg-white hover:bg-gray-100 invisible"
            >
            </button>
            
            {/* Row 5 */}
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border col-span-4"
              onClick={() => handleCalculatorAction('number', '0')}
            >
              0
            </button>
            
            {/* Rodapé com os botões de ação */}
            <div className="col-span-4 grid grid-cols-2 gap-2 mt-4">
              <button 
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 rounded"
                onClick={closeCalculator}
              >
                Fechar
              </button>
              <button 
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded"
                onClick={applyCalculatorResult}
              >
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>Confirmar</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
