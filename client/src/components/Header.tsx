import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { School, LogOut, Menu, User, Home, BookOpen, BarChart } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Sheet, 
  SheetTrigger, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetClose 
} from '@/components/ui/sheet';

const MobileMenu: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { logoutMutation, teacher } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation('/auth');
      }
    });
  };

  const isAdmin = teacher?.isAdmin;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[80vw] max-w-xs">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <School className="h-5 w-5 text-primary-500" />
            <span>CLASSE ALUNOS</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="py-4">
          <div className="space-y-1 py-6">
            <SheetClose asChild>
              <Link href="/">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Início</span>
                </Button>
              </Link>
            </SheetClose>
            
            <SheetClose asChild>
              <Link href="/classes">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Classes</span>
                </Button>
              </Link>
            </SheetClose>
            
            {isAdmin && (
              <SheetClose asChild>
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <BarChart className="mr-2 h-4 w-4" />
                    <span>Administração</span>
                  </Button>
                </Link>
              </SheetClose>
            )}
          </div>
          
          <div className="pt-6 border-t border-gray-200">
            <div className="px-2 py-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{teacher?.name}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {isAdmin ? 'Administrador' : 'Professor'}
              </div>
            </div>
            
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleLogout}
              className="w-full mt-4"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Header: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { logoutMutation, teacher } = useAuth();
  const isMobile = useIsMobile();
  
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        {isMobile ? (
          <div className="flex items-center justify-between w-full">
            <MobileMenu />
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <School className="h-5 w-5 text-primary-500 mr-2" />
                <h1 className="text-lg font-semibold text-gray-800">CLASSE ALUNOS</h1>
              </div>
            </Link>
            <div className="w-8" aria-hidden="true"></div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
