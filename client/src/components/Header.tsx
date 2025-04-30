import React from 'react';
import { Link, useLocation } from 'wouter';
import { School, LogOut } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

const Header: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { logoutMutation } = useAuth();
  
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
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation('/auth');
      }
    });
  };
  
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/">
          <div className={cn(
            "flex items-center cursor-pointer",
            "hover:opacity-90 transition-opacity"
          )}>
            <School className="h-6 w-6 text-primary-500 mr-2" />
            <h1 className="text-xl font-semibold text-gray-800">CLASSE ALUNOS</h1>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          {isWizard && currentClassName && (
            <span className="text-sm text-gray-600">{currentClassName}</span>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-1 text-gray-600 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
