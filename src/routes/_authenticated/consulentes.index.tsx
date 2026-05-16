import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, Phone } from "lucide-react";
import { ConsulenteFormDialog } from "@/components/app/ConsulenteFormDialog";

export const Route = createFileRoute("/_authenticated/consulentes/")({
  component: ConsulentesPage,
});

function ConsulentesPage() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data, refetch } = useQuery({
    queryKey: ["consulentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consulentes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((c) =>
    c.nome.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-serif">Consulentes</h1>
          <p className="text-muted-foreground mt-1">Cadastro e histórico</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-2" /> Novo consulente
        </Button>
      </header>

      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Nenhum consulente encontrado.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link
                  to="/consulentes/$id"
                  params={{ id: c.id }}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{c.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.signo ?? "—"}
                      {c.telefone ? (
                        <>
                          {" • "}
                          <Phone className="inline size-3 mr-1" />
                          {c.telefone}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className="text-primary text-sm">Ver detalhes →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConsulenteFormDialog open={open} onOpenChange={setOpen} onSaved={refetch} />
    </div>
  );
}