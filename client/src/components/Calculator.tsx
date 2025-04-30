import React from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { X, Delete } from 'lucide-react';
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
          <h3 className="text-lg font-medium text-white">Calculadora</h3>
          <button 
            className="text-white hover:text-gray-200 focus:outline-none"
            onClick={closeCalculator}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Calculator display */}
          <div className="bg-gray-100 border border-gray-300 rounded-md p-3 mb-4 text-right">
            <div className="text-sm text-gray-600 mb-1">{calculatorExpression}</div>
            <div className="text-2xl font-medium text-gray-900">{calculatorResult}</div>
          </div>
          
          {/* Calculator grid */}
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
              onClick={() => handleCalculatorAction('clearEntry')}
            >
              CE
            </button>
            <button 
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded"
              onClick={() => handleCalculatorAction('backspace')}
            >
              <Delete className="h-4 w-4 mx-auto" />
            </button>
            <button 
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded"
              onClick={() => handleCalculatorAction('add')}
            >
              +
            </button>
            
            {/* Row 2 */}
            {[7, 8, 9].map(num => (
              <button 
                key={num}
                className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
                onClick={() => handleCalculatorAction('number', num.toString())}
              >
                {num}
              </button>
            ))}
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded">
              -
            </button>
            
            {/* Row 3 */}
            {[4, 5, 6].map(num => (
              <button 
                key={num}
                className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
                onClick={() => handleCalculatorAction('number', num.toString())}
              >
                {num}
              </button>
            ))}
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded">
              ×
            </button>
            
            {/* Row 4 */}
            {[1, 2, 3].map(num => (
              <button 
                key={num}
                className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border"
                onClick={() => handleCalculatorAction('number', num.toString())}
              >
                {num}
              </button>
            ))}
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded">
              ÷
            </button>
            
            {/* Row 5 */}
            <button 
              className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border col-span-2"
              onClick={() => handleCalculatorAction('number', '0')}
            >
              0
            </button>
            <button className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded border">
              ,
            </button>
            <button 
              className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 rounded"
              onClick={() => handleCalculatorAction('equals')}
            >
              =
            </button>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={applyCalculatorResult}
            >
              APLICAR RESULTADO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
