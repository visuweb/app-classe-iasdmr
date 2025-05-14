import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText = res.statusText;
    
    // Tentar extrair o texto do corpo da resposta se houver
    try {
      const textResponse = await res.text();
      if (textResponse) {
        // Verificar se parece ser HTML (começa com <!DOCTYPE ou <html)
        if (textResponse.trim().startsWith('<!DOCTYPE') || textResponse.trim().startsWith('<html')) {
          errorText = "Erro de conexão: o servidor retornou HTML em vez de JSON";
        } else {
          // Verificar se é um JSON antes de tentar fazer o parse
          try {
            const jsonResponse = JSON.parse(textResponse);
            errorText = jsonResponse.message || textResponse;
          } catch {
            // Se não for um JSON válido, use o texto como está
            errorText = textResponse;
          }
        }
      }
    } catch {
      // Em caso de erro ao ler o texto, mantenha o statusText original
    }
    
    throw new Error(errorText);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    // Garantir que a URL está formatada corretamente
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    
    const res = await fetch(cleanUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Para verificar o CPF, vamos tratar especialmente - só queremos saber se existe
    if (cleanUrl.includes('/api/teachers/check-cpf/') && method === 'GET') {
      if (res.status === 200) {
        return new Response(JSON.stringify({ exists: true }), {
          status: 200,
          headers: {'Content-Type': 'application/json'}
        });
      } else if (res.status === 404) {
        return new Response(JSON.stringify({ exists: false }), {
          status: 200,
          headers: {'Content-Type': 'application/json'}
        });
      }
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`Erro na requisição ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
