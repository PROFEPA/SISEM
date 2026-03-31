"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[${this.props.sectionName || "Section"}] Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="rounded-xl bg-red-50 border border-red-200 p-8 max-w-md text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900">
              Error en {this.props.sectionName || "esta sección"}
            </h3>
            <p className="text-sm text-red-700">
              {this.state.error?.message || "Ocurrió un error inesperado."}
            </p>
            <Button
              variant="outline"
              className="gap-2 cursor-pointer border-red-300 text-red-700 hover:bg-red-100"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
