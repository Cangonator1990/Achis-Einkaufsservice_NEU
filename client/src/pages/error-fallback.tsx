import { Button } from "@/components/ui/button";

type ErrorFallbackProps = {
  error?: Error;
  resetError?: () => void;
};

export default function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleReset = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.href = '/';
    }
  };
  
  const errorMessage = error?.message || "Ein unbekannter Fehler ist aufgetreten";
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-800">
          Achis Einkaufservice
        </h2>
        <div className="p-4 mb-4 text-sm text-red-600 bg-red-100 rounded-md">
          <p>
            {errorMessage}
          </p>
        </div>
        <Button onClick={handleReset} className="w-full">
          Erneut versuchen
        </Button>
      </div>
    </div>
  );
}