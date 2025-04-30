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
import { School, ClipboardList, BarChart3, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const Home: React.FC = () => {
  const { teacher } = useAuth();
  const [_, setLocation] = useLocation();
  
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
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">CLASSE ALUNOS</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Sistema para controle de presença de alunos e atividades missionárias
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-2">
              <School className="h-8 w-8 text-primary-500" />
            </div>
            <CardTitle>Minhas Classes</CardTitle>
            <CardDescription>Acesse suas turmas</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">
              Visualize suas classes e gerencie os alunos de suas turmas.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/classes">
              <Button>Acessar Classes</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-2">
              <ClipboardList className="h-8 w-8 text-primary-500" />
            </div>
            <CardTitle>Iniciar Registro</CardTitle>
            <CardDescription>Chamada e atividades missionárias</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">
              Registre presença e atividades missionárias com um fluxo intuitivo de 3 etapas.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/wizard">
              <Button variant="default">Iniciar Registro</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="h-8 w-8 text-primary-500" />
            </div>
            <CardTitle>Ver Registros</CardTitle>
            <CardDescription>Histórico e estatísticas</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">
              Visualize o histórico de presença e atividades missionárias de suas classes.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/records">
              <Button variant="outline">Ver Registros</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Home;
