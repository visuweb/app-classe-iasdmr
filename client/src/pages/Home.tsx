import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { School, ClipboardList, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import Header from '@/components/Header';

const Home: React.FC = () => {
  const { teacher } = useAuth();
  const [_, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
  // Redirecionar administradores para a página administrativa
  useEffect(() => {
    if (teacher?.isAdmin) {
      setLocation('/admin');
    }
  }, [teacher, setLocation]);
  
  // Não mostrar a página home para administradores
  if (teacher?.isAdmin) {
    return null;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 py-6 px-4">
        <div className={`text-center mb-6 ${isMobile ? 'mt-2' : 'mt-6'}`}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-800 mb-2`}>
            Bem-vindo, {teacher?.name}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm">
            Sistema para controle de presença de alunos e atividades missionárias
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto mt-4">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <School className="h-6 w-6 text-primary-500" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-medium text-base">Minhas Classes</h3>
                <p className="text-sm text-gray-500">Gerencie suas turmas e alunos</p>
              </div>
              <Link href="/classes">
                <Button size={isMobile ? "sm" : "default"} className="shrink-0">Acessar</Button>
              </Link>
            </div>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary-500" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-medium text-base">Iniciar Registro</h3>
                <p className="text-sm text-gray-500">Chamada e atividades missionárias</p>
              </div>
              <Link href="/wizard">
                <Button size={isMobile ? "sm" : "default"} variant="default" className="shrink-0">Iniciar</Button>
              </Link>
            </div>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary-500" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-medium text-base">Ver Registros</h3>
                <p className="text-sm text-gray-500">Histórico de atividades</p>
              </div>
              <Link href="/records">
                <Button size={isMobile ? "sm" : "default"} variant="outline" className="shrink-0">Acessar</Button>
              </Link>
            </div>
          </Card>
        </div>
        
        {!isMobile && (
          <div className="text-center mt-12 text-gray-500 text-sm">
            <p>Deslize o dedo para a direita para acessar o menu em dispositivos móveis</p>
          </div>
        )}
        
        <div className="mt-12 text-center text-xs text-gray-400">
          <p>CLASSE ALUNOS v1.0</p>
        </div>
      </main>
    </div>
  );
};

export default Home;
