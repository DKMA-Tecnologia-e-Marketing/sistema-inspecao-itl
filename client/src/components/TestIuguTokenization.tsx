import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Componente de teste isolado para tokenização Iugu JS
 * Usa valores hardcoded para validar o funcionamento antes de integrar com inputs
 */
export default function TestIuguTokenization() {
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [iuguLoaded, setIuguLoaded] = useState(false);

  // Carregar Iugu JS
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ((window as any).Iugu) {
        setIuguLoaded(true);
      } else {
        const script = document.createElement("script");
        script.src = "https://js.iugu.com/v2";
        script.async = true;
        script.onload = () => {
          setIuguLoaded(true);
          setResult((prev) => prev + "✅ Iugu JS carregado com sucesso!\n");
        };
        script.onerror = () => {
          setResult((prev) => prev + "❌ Erro ao carregar Iugu JS\n");
        };
        document.body.appendChild(script);
      }
    }
  }, []);

  const testTokenization = () => {
    setIsLoading(true);
    setResult("Inicializando teste...\n");

    try {
      const Iugu = (window as any).Iugu;
      if (!Iugu) {
        throw new Error("Iugu JS não está carregado. Certifique-se de que https://js.iugu.com/v2 está carregado.");
      }

      // MASTER ACCOUNT ID - SUBSTITUA PELO VALOR REAL
      const MASTER_ACCOUNT_ID = "AB322336DF564D5D80AD8101356AE0EA";

      // Configurar Iugu
      Iugu.setAccountID(MASTER_ACCOUNT_ID);
      Iugu.setTestMode(true);

      setResult((prev) => prev + `Iugu configurado com accountId: ${MASTER_ACCOUNT_ID.substring(0, 8)}***\n`);
      setResult((prev) => prev + "Modo de teste: true\n\n");

      // Valores hardcoded (cartão de teste válido da Iugu)
      const tokenData = {
        number: "4111111111111111", // Cartão de teste Visa válido
        verification_value: "123", // CVV
        first_name: "Teste",
        last_name: "Usuario",
        month: "12",
        year: "2026",
      };

      setResult((prev) => prev + "Dados para tokenização (hardcoded):\n");
      setResult(
        (prev) =>
          prev +
          JSON.stringify(
            {
              ...tokenData,
              number: tokenData.number.substring(0, 4) + "****" + tokenData.number.substring(tokenData.number.length - 4),
              verification_value: "***",
            },
            null,
            2
          ) +
          "\n\n"
      );
      setResult((prev) => prev + "Chamando Iugu.createPaymentToken...\n");

      // Chamar tokenização
      Iugu.createPaymentToken(tokenData, (data: any) => {
        setIsLoading(false);

        if (data.errors) {
          setResult(
            (prev) =>
              prev +
              "\n❌ ERRO na tokenização:\n" +
              JSON.stringify(data.errors, null, 2)
          );
        } else if (data.id) {
          setResult(
            (prev) =>
              prev +
              "\n✅ SUCESSO! Token gerado:\n" +
              `Token ID: ${data.id}\n\n` +
              "Resposta completa:\n" +
              JSON.stringify(data, null, 2)
          );
        } else {
          setResult(
            (prev) =>
              prev +
              "\n⚠️ Resposta inesperada:\n" +
              JSON.stringify(data, null, 2)
          );
        }
      });
    } catch (error: any) {
      setIsLoading(false);
      setResult(
        (prev) =>
          prev +
          `\n❌ ERRO: ${error.message}\n${error.stack || ""}`
      );
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Teste Isolado de Tokenização Iugu JS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Status do Iugu JS: {iuguLoaded ? "✅ Carregado" : "⏳ Carregando..."}
          </p>
          <Button onClick={testTokenization} disabled={isLoading || !iuguLoaded}>
            {isLoading ? "Testando..." : "Testar Tokenização com Valores Hardcoded"}
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-md">
            <h3 className="font-semibold mb-2">Resultado:</h3>
            <pre className="text-sm whitespace-pre-wrap font-mono overflow-auto max-h-96">
              {result}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
