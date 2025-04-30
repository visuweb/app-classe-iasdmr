import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
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
