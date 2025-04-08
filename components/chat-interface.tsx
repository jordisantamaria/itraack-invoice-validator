"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "ai/react";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ChatInterface() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      initialMessages: [
        {
          id: "1",
          role: "assistant",
          content:
            "¡Hola! Soy tu asistente de Moodif. ¿En qué puedo ayudarte hoy? Puedo ayudarte con reservas, check-in, facturación y más.",
        },
      ],
      onError: (error) => {
        console.error("Chat Error:", error);
        try {
          // Intentar extraer el mensaje de error JSON
          const errorObj = JSON.parse(error.message);
          setErrorMessage(
            errorObj.error || "Error en la comunicación con el asistente"
          );
        } catch (e) {
          setErrorMessage(
            error.message || "Error en la comunicación con el asistente"
          );
        }
      },
    });

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Limpiar el error cuando se envía un nuevo mensaje
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setErrorMessage(null);
    handleSubmit(e);
  };

  return (
    <Card className="w-full">
      <div className="h-[600px] flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {/* Mostrar mensaje de error */}
            {errorMessage && (
              <div className="flex justify-center">
                <div className="max-w-[90%] rounded-lg p-4 bg-destructive text-destructive-foreground text-sm">
                  <p className="font-semibold">Error:</p>
                  <p>{errorMessage}</p>
                  <p className="mt-2 text-xs">
                    Esto puede deberse a un problema con la API de OpenAI o a
                    que se ha agotado la cuota.
                  </p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <form
          onSubmit={handleFormSubmit}
          className="border-t p-4 flex items-center space-x-2"
        >
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Escribe tu mensaje..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
