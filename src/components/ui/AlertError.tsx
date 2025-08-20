import React from 'react';
import { AlertCircle } from 'lucide-react';

interface AlertErrorProps {
  message: string;
}

export function AlertError({ message }: AlertErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-red-50 border-l-4 border-red-400 p-4 w-full max-w-md">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-700">{message}</p>
        </div>
      </div>
    </div>
  );
}