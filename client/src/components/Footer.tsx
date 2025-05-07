import React from 'react';
import { useAuth } from '@/hooks/use-auth';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { teacher } = useAuth();
  
  // Se não houver professor autenticado, não renderizar o rodapé
  if (!teacher) {
    return null;
  }
  
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          &copy; {currentYear} TURMA CLASSE - Sistema de Controle de Presença e Atividades Missionárias
        </p>
      </div>
    </footer>
  );
};

export default Footer;
