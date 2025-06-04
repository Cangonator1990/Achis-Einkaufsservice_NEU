import React from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function NotificationTestButton() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const createTestNotification = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/api/test/create-notification", {
        method: "GET"
      });
      
      // Invalidieren der Benachrichtigungen abfragen
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
      
      toast({
        title: "Test-Benachrichtigung erstellt",
        description: "Eine neue Test-Benachrichtigung wurde erfolgreich erstellt.",
        variant: "default"
      });
    } catch (error) {
      console.error("Fehler beim Erstellen der Test-Benachrichtigung:", error);
      toast({
        title: "Fehler",
        description: "Die Test-Benachrichtigung konnte nicht erstellt werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      className="ml-2"
      onClick={createTestNotification}
      disabled={loading}
    >
      {loading ? "..." : "Test-Benachrichtigung"}
    </Button>
  );
}