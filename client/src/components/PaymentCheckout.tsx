import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CreditCard, QrCode, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PaymentCheckoutProps {
  paymentId: number;
  amount: number;
  accountId?: string; // IUGU subaccount ID (opcional, para referência)
  masterAccountId?: string; // IUGU master account ID para tokenização do Iugu JS (obrigatório para cartão)
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PaymentCheckout({
  paymentId,
  amount,
  accountId,
  masterAccountId,
  onSuccess,
  onCancel,
}: PaymentCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("card");
  const [showMethodSelection, setShowMethodSelection] = useState(true);
  
  // Estados separados para número do cartão: raw (apenas dígitos) e display (formatado)
  const [cardNumberRaw, setCardNumberRaw] = useState<string>(""); // Apenas dígitos (sem espaços, hífens ou asteriscos)
  const [cardNumberDisplay, setCardNumberDisplay] = useState<string>(""); // Formatado para exibição (com espaços)
  
  const [cardData, setCardData] = useState({
    name: "",
    expiry: "",
    cvv: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const iuguConfiguredRef = useRef<boolean>(false); // Ref para garantir que Iugu.setAccountID seja chamado apenas uma vez

  const { data: payment, refetch: refetchPayment, isLoading: isLoadingPayment } = trpc.payments.getById.useQuery(
    { id: paymentId },
    {
      enabled: !!paymentId,
      refetchInterval: (query) => {
        const hasQrCode = query.state.data?.iuguInvoice?.qr_code_pix || query.state.data?.iuguInvoice?.pix_qr_code;
        const status = query.state.data?.status;
        
        if (status !== "aprovado") {
          if (paymentMethod === "pix" && !hasQrCode) {
            return 2000;
          }
          return 3000;
        }
        return false;
      },
    }
  );

  // Detectar quando o pagamento é aprovado e mostrar sucesso automaticamente
  useEffect(() => {
    if (payment?.status === "aprovado" && paymentStatus !== "success") {
      setPaymentStatus("success");
      toast.success("Pagamento aprovado com sucesso!");
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    }
  }, [payment?.status, paymentStatus, onSuccess]);

  const processCardPayment = trpc.payments.processCardPayment.useMutation();
  const consultarStatus = trpc.payments.consultarStatus.useQuery(
    { paymentId },
    { enabled: false, refetchOnWindowFocus: false }
  );

  // Carregar IUGU JS quando método for cartão e masterAccountId estiver disponível
  useEffect(() => {
    if (paymentMethod === "card" && masterAccountId && typeof window !== "undefined") {
      if (!(window as any).Iugu) {
        const script = document.createElement("script");
        script.src = "https://js.iugu.com/v2";
        script.async = true;
        script.onerror = () => {
          console.error("[PaymentCheckout] Erro ao carregar IUGU JS");
        };
        document.body.appendChild(script);
      }
    }
  }, [paymentMethod, masterAccountId]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  // Formatar número do cartão para exibição (apenas visual, não altera cardNumberRaw)
  const formatCardNumberDisplay = (raw: string): string => {
    const cleaned = raw.replace(/\D/g, "");
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(" ") : cleaned;
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  // Handler para mudança no número do cartão
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // BLOQUEAR asteriscos: se o input contiver "*", não processar
    if (inputValue.includes("*")) {
      // Limpar estados se detectar asterisco (cartão mascarado)
      setCardNumberRaw("");
      setCardNumberDisplay("");
      return;
    }
    
    // Extrair apenas dígitos do input (remove espaços, hífens, etc, mas não asteriscos porque já foram bloqueados)
    const rawDigits = inputValue.replace(/\D/g, "");
    
    // Limitar a 19 dígitos
    const limitedRaw = rawDigits.slice(0, 19);
    
    // Atualizar estado raw (apenas dígitos)
    setCardNumberRaw(limitedRaw);
    
    // Atualizar estado display (formatado para exibição)
    setCardNumberDisplay(formatCardNumberDisplay(limitedRaw));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    setCardData({ ...cardData, expiry: formatted });
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCardData({ ...cardData, cvv: cleaned });
  };

  const handleCardPayment = async () => {
    // Validar se cardNumberRaw está preenchido
    if (!cardNumberRaw || !cardData.name || !cardData.expiry || !cardData.cvv) {
      toast.error("Preencha todos os dados do cartão");
      return;
    }

    // BLOQUEAR tokenização se o valor contiver "*" (cartão mascarado)
    if (cardNumberRaw.includes("*") || cardNumberDisplay.includes("*")) {
      toast.error("Número do cartão inválido. Digite o número completo do cartão.");
      return;
    }

    // Validar que cardNumberRaw contém apenas dígitos (sem asteriscos ou caracteres especiais)
    if (!/^\d+$/.test(cardNumberRaw)) {
      toast.error("Número do cartão inválido. Digite apenas números.");
      return;
    }

      // Validar comprimento do número do cartão (apenas dígitos)
      if (cardNumberRaw.length < 13 || cardNumberRaw.length > 19) {
        toast.error("Número do cartão inválido. Deve ter entre 13 e 19 dígitos.");
        return;
      }

      // Validar número do cartão usando algoritmo de Luhn
      const luhnCheck = (cardNumber: string): boolean => {
        let sum = 0;
        let isEven = false;
        for (let i = cardNumber.length - 1; i >= 0; i--) {
          let digit = parseInt(cardNumber[i]);
          if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
          }
          sum += digit;
          isEven = !isEven;
        }
        return sum % 10 === 0;
      };

      if (!luhnCheck(cardNumberRaw)) {
        toast.error("Número do cartão inválido. Verifique o número digitado.");
        console.warn("[PaymentCheckout] Número do cartão não passou na validação de Luhn:", cardNumberRaw.substring(0, 4) + "****" + cardNumberRaw.substring(cardNumberRaw.length - 4));
        return;
      }

    // Validar formato da validade
    if (!cardData.expiry.match(/^\d{2}\/\d{2}$/)) {
      toast.error("Validade inválida. Use o formato MM/AA");
      return;
    }

    // Validar CVV
    const cleanedCvv = cardData.cvv.replace(/\D/g, "");
    if (cleanedCvv.length < 3 || cleanedCvv.length > 4) {
      toast.error("CVV inválido. Deve ter 3 ou 4 dígitos");
      return;
    }

    setIsProcessing(true);
    setPaymentStatus("processing");

    try {
      if (!masterAccountId) {
        throw new Error("Master Account ID não disponível. Não é possível processar pagamento com cartão.");
      }

      const Iugu = (window as any).Iugu;
      if (!Iugu) {
        throw new Error("IUGU JS não está carregado. Aguarde alguns segundos e tente novamente.");
      }

      if (typeof Iugu.setAccountID !== "function" || typeof Iugu.createPaymentToken !== "function") {
        throw new Error("IUGU JS não está configurado corretamente. Recarregue a página e tente novamente.");
      }

      // Configurar Iugu.setAccountID uma única vez (antes da tokenização)
      if (!iuguConfiguredRef.current) {
        Iugu.setAccountID(masterAccountId.trim());
        
        // Configurar modo de teste (apenas para desenvolvimento local)
        // Em produção, não chamar setTestMode (deixa o padrão da Iugu)
        const isTestMode = typeof window !== "undefined" && (
          window.location.hostname === "localhost" || 
          window.location.hostname === "127.0.0.1"
        );
        if (typeof Iugu.setTestMode === "function" && isTestMode) {
          Iugu.setTestMode(true);
          console.log(`[PaymentCheckout] Iugu configurado em modo TESTE (apenas para desenvolvimento local)`);
        }
        
        iuguConfiguredRef.current = true;
      }

      // Separar mês e ano da validade
      const [month, year] = cardData.expiry.split("/");
      const expiryYear = "20" + year;

      // Validar mês
      const monthNum = parseInt(month, 10);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw new Error("Mês inválido. Deve estar entre 01 e 12");
      }

      // Validar data de validade
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const expiryYearNum = parseInt(expiryYear, 10);
      if (isNaN(expiryYearNum)) {
        throw new Error("Ano de validade inválido");
      }
      if (expiryYearNum < currentYear || (expiryYearNum === currentYear && monthNum < currentMonth)) {
        throw new Error("Data de validade no passado. Verifique mês e ano");
      }

      // Preparar dados para tokenização
      // IMPORTANTE: Usar cardNumberRaw (apenas dígitos, sem formatação)
      const tokenData = {
        number: cardNumberRaw, // Apenas dígitos, sem espaços, hífens ou asteriscos
        verification_value: cleanedCvv,
        first_name: (cardData.name.split(" ")[0] || cardData.name).trim(),
        last_name: (cardData.name.split(" ").slice(1).join(" ") || cardData.name.split(" ")[0] || cardData.name).trim(),
        month: String(monthNum).padStart(2, "0"),
        year: String(expiryYearNum),
      };

      // Validar que todos os campos obrigatórios estão preenchidos
      if (!tokenData.number || !tokenData.verification_value || !tokenData.first_name || !tokenData.month || !tokenData.year) {
        throw new Error("Dados do cartão incompletos");
      }

      // Validar que o número do cartão contém apenas dígitos (sem asteriscos)
      if (!/^\d{13,19}$/.test(tokenData.number)) {
        throw new Error("Número do cartão inválido. Digite o número completo do cartão.");
      }

      // VALIDAÇÃO FINAL: Garantir que não há asteriscos antes de tokenizar
      if (tokenData.number.includes("*")) {
        throw new Error("Número do cartão mascarado não pode ser tokenizado. Digite o número completo.");
      }

      // LOG DETALHADO: Verificar exatamente o que está sendo enviado
      console.log("[PaymentCheckout] Dados para tokenização:", {
        numberLength: tokenData.number.length,
        numberPreview: `${tokenData.number.substring(0, 4)}****${tokenData.number.substring(tokenData.number.length - 4)}`,
        numberFull: tokenData.number, // Log completo para debug
        cardNumberRawLength: cardNumberRaw.length,
        cardNumberRawPreview: `${cardNumberRaw.substring(0, 4)}****${cardNumberRaw.substring(cardNumberRaw.length - 4)}`,
        cardNumberRawFull: cardNumberRaw, // Log completo para debug
        cvvLength: tokenData.verification_value.length,
        month: tokenData.month,
        year: tokenData.year,
        firstName: tokenData.first_name,
        lastName: tokenData.last_name,
      });

      // Tokenizar o cartão usando IUGU JS
      Iugu.createPaymentToken(
        tokenData,
        (data: any) => {
          if (data.errors) {
            console.error("[PaymentCheckout] Erro ao tokenizar cartão (JSON completo):", JSON.stringify({
              errors: data.errors,
              fullResponse: data,
              tokenDataNumberLength: tokenData.number.length,
              tokenDataNumberPreview: `${tokenData.number.substring(0, 4)}****${tokenData.number.substring(tokenData.number.length - 4)}`,
            }, null, 2));
            setIsProcessing(false);
            setPaymentStatus("error");
            
            let errorMessage = "";
            if (typeof data.errors === "string") {
              errorMessage = data.errors;
            } else if (typeof data.errors === "object") {
              if (data.errors.number) {
                errorMessage = `Número do cartão: ${Array.isArray(data.errors.number) ? data.errors.number.join(", ") : data.errors.number}`;
              } else if (data.errors.verification_value) {
                errorMessage = `CVV: ${Array.isArray(data.errors.verification_value) ? data.errors.verification_value.join(", ") : data.errors.verification_value}`;
              } else if (data.errors.record_invalid) {
                const recordError = data.errors.record_invalid;
                if (typeof recordError === "string" && recordError.includes("Number is invalid")) {
                  errorMessage = "Número do cartão inválido. Verifique se o número está correto e tente novamente.";
                } else {
                  errorMessage = `Validação falhou: ${recordError}`;
                }
              } else {
                errorMessage = Object.entries(data.errors)
                  .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
                  .join("; ");
              }
            } else {
              errorMessage = "Erro desconhecido ao processar cartão";
            }
            
            toast.error("Erro ao processar cartão: " + errorMessage);
            return;
          }

          if (!data.id) {
            setIsProcessing(false);
            setPaymentStatus("error");
            toast.error("Erro ao tokenizar cartão. Tente novamente.");
            return;
          }

          // Processar pagamento usando o token
          processCardPayment.mutate(
            {
              paymentId,
              token: data.id,
              installments: 1,
            },
            {
              onSuccess: (result) => {
                if (result.success) {
                  setPaymentStatus("success");
                  toast.success("Pagamento processado com sucesso!");
                  setTimeout(() => {
                    refetchPayment();
                    onSuccess?.();
                  }, 2000);
                } else {
                  setPaymentStatus("error");
                  // Usar a mensagem já formatada pelo backend que inclui tratamento para códigos LR
                  const errorMessage = result.message || "Erro ao processar pagamento";
                  
                  // Log detalhado para debug
                  if ((result as any).LR) {
                    console.log(`[PaymentCheckout] Transação negada - LR: ${(result as any).LR}, Status: ${(result as any).status}, Mensagem: ${errorMessage}`);
                  }
                  
                  // Exibir mensagem de erro (já formatada pelo backend)
                  toast.error(errorMessage, {
                    duration: 6000,
                    description: (result as any).infoMessage || (result as any).LR ? `Código: ${(result as any).LR}` : undefined,
                  });
                }
                setIsProcessing(false);
              },
              onError: (error) => {
                setPaymentStatus("error");
                console.error("[PaymentCheckout] Erro ao processar pagamento:", error);
                toast.error(error.message || "Erro ao processar pagamento");
                setIsProcessing(false);
              },
            }
          );
        }
      );
    } catch (error: any) {
      toast.error("Erro ao processar pagamento: " + error.message);
      setIsProcessing(false);
      setPaymentStatus("error");
    }
  };

  if (paymentStatus === "success") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">Pagamento Aprovado!</h3>
            <p className="text-sm text-muted-foreground">
              Seu pagamento foi processado com sucesso.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === "error") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold">Erro no Pagamento</h3>
            <p className="text-sm text-muted-foreground">
              Não foi possível processar o pagamento. Tente novamente.
            </p>
            <Button onClick={() => setPaymentStatus("idle")} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagamento</CardTitle>
        <CardDescription>
          Valor: <span className="font-semibold">{formatCurrency(amount)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showMethodSelection && (
          <RadioGroup value={paymentMethod} onValueChange={(value) => {
            const newMethod = value as "pix" | "card";
            setPaymentMethod(newMethod);
            setShowMethodSelection(false);
            // Limpar estados de cartão ao mudar método (garantir que inputs começam vazios)
            if (newMethod === "card") {
              setCardNumberRaw("");
              setCardNumberDisplay("");
              setCardData({ name: "", expiry: "", cvv: "" });
            }
          }}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pix" id="pix" />
              <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer">
                <QrCode className="h-4 w-4" />
                PIX
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                <CreditCard className="h-4 w-4" />
                Cartão de Crédito
              </Label>
            </div>
          </RadioGroup>
        )}

        {!showMethodSelection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowMethodSelection(true);
              // Limpar estados de cartão ao voltar para seleção de método
              setCardNumberRaw("");
              setCardNumberDisplay("");
              setCardData({ name: "", expiry: "", cvv: "" });
            }}
            className="mb-2"
          >
            ← Alterar método de pagamento
          </Button>
        )}

        {paymentMethod === "pix" && (
          <div className="space-y-4">
            {isLoadingPayment || (payment?.iuguInvoice && !payment.iuguInvoice.qr_code_pix && !payment.iuguInvoice.pix_qr_code) ? (
              <div className="text-center space-y-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <div>
                  <p className="text-sm font-medium">Gerando QR Code PIX...</p>
                  <p className="text-xs text-muted-foreground mt-1">Aguarde alguns instantes</p>
                </div>
              </div>
            ) : payment?.iuguInvoice?.qr_code_pix || payment?.iuguInvoice?.pix_qr_code ? (
              <>
                <div className="text-center">
                  <p className="text-sm font-medium mb-2">Escaneie o QR Code para pagar via PIX</p>
                  <div className="flex justify-center p-4 bg-white rounded-lg border">
                    <img
                      src={payment.iuguInvoice.qr_code_pix || payment.iuguInvoice.pix_qr_code}
                      alt="QR Code PIX"
                      className="w-64 h-64"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await consultarStatus.refetch();
                        await refetchPayment();
                        toast.success("Status do pagamento atualizado!");
                      } catch (error: any) {
                        toast.error("Erro ao verificar pagamento. Tente novamente.");
                      }
                    }}
                    disabled={consultarStatus.isFetching}
                  >
                    {consultarStatus.isFetching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Verificar Pagamento
                      </>
                    )}
                  </Button>
                  {payment?.status === "aprovado" && (
                    <div className="text-sm text-green-600 font-medium">
                      ✓ Pagamento aprovado!
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>QR Code PIX não disponível ainda.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => refetchPayment()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
        )}

        {paymentMethod === "card" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Número do Cartão</Label>
              <Input
                id="cardNumber"
                placeholder="0000 0000 0000 0000"
                value={cardNumberDisplay}
                onChange={handleCardNumberChange}
                maxLength={23}
                disabled={isProcessing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardName">Nome no Cartão</Label>
              <Input
                id="cardName"
                placeholder="NOME COMPLETO"
                value={cardData.name}
                onChange={(e) => setCardData({ ...cardData, name: e.target.value.toUpperCase() })}
                disabled={isProcessing}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardExpiry">Validade</Label>
                <Input
                  id="cardExpiry"
                  placeholder="MM/AA"
                  value={cardData.expiry}
                  onChange={handleExpiryChange}
                  maxLength={5}
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardCvv">CVV</Label>
                <Input
                  id="cardCvv"
                  placeholder="123"
                  type="password"
                  value={cardData.cvv}
                  onChange={handleCvvChange}
                  maxLength={4}
                  disabled={isProcessing}
                />
              </div>
            </div>

            <Button
              onClick={handleCardPayment}
              disabled={isProcessing || !cardNumberRaw || !cardData.name || !cardData.expiry || !cardData.cvv}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar {formatCurrency(amount)}
                </>
              )}
            </Button>
          </div>
        )}

        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="w-full" disabled={isProcessing}>
            Cancelar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
