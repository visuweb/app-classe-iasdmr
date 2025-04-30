import React from 'react';
import { Link, useLocation } from 'wouter';
import { School } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';

const Header: React.FC = () => {
  const [location] = useLocation();
  
  // Get current class name from context (if in wizard)
  const isWizard = location.includes('/wizard');
  let currentClassName = '';
  
  try {
    if (isWizard) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { currentClassName: name } = useWizard();
      currentClassName = name;
    }
  } catch (error) {
    // Handle case when not in wizard context
  }
  
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/">
          <a className="flex items-center">
            <School className="h-6 w-6 text-primary-500 mr-2" />
            <h1 className="text-xl font-semibold text-gray-800">TURMA CLASSE</h1>
          </a>
        </Link>
        
        {isWizard && currentClassName && (
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">{currentClassName}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
