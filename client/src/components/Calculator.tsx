import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { X, Delete, CheckCircle, PlusCircle } from 'lucide-react';
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
  
  if (!calculatorOpen) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300",
        calculatorOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
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
          
          {/* Calculator grid - Redesenhada conforme a imagem de referência */}
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
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded col-span-2"
              onClick={() => handleCalculatorAction('add')}
            >
              <div className="flex items-center justify-center">
                <PlusCircle className="h-4 w-4 mr-1" />
                <span>Adicionar</span>
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
            <div className="row-span-3">
              <button 
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded h-full w-full"
                onClick={applyCalculatorResult}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <CheckCircle className="h-5 w-5 mb-1" />
                  <span className="text-xs">Confirmar</span>
                </div>
              </button>
            </div>
            
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
            
            {/* Row 5 */}
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border col-span-3"
              onClick={() => handleCalculatorAction('number', '0')}
            >
              0
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
