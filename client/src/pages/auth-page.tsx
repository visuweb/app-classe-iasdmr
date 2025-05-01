import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, School, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// Login form schema
const loginSchema = z.object({
  cpf: z.string().min(1, 'CPF é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginValues = z.infer<typeof loginSchema>;

const AuthPage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loginError, setLoginError] = useState<string>('');
  
  // Usar o hook useAuth para autenticação
  const { teacher, isLoading, loginMutation } = useAuth();
  
  // Redirecionar para a página inicial se já estiver autenticado
  useEffect(() => {
    if (teacher) {
      setLocation('/');
    }
  }, [teacher, setLocation]);

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      cpf: '',
      password: '',
    },
  });

  // Login handler
  const onLoginSubmit = (values: LoginValues) => {
    setLoginError('');
    loginMutation.mutate(values, {
      onError: (error: Error) => {
        setLoginError(error.message);
      },
      onSuccess: () => {
        toast({
          title: 'Login realizado com sucesso',
          description: 'Você está sendo redirecionado...',
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto">
        {/* Header/Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <School className="h-8 w-8 text-primary-500" />
            <h1 className="text-2xl font-bold text-gray-900">CLASSE ALUNOS</h1>
          </div>
        </div>
        
        {/* Login Card */}
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-xl">
              Entrar no Sistema
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {loginError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite seu CPF" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Digite sua senha" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="flex justify-center pt-0">
            <p className="text-xs text-center text-gray-500">
              Credenciais para teste:
              <br />
              Admin: admin / admincei2025
              <br />
              Professor: 123456789 / 123456
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;