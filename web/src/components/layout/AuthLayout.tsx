import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  ShieldCheck,
  Zap,
  Database,
  Globe,
  Brain,
  Rocket,
  ArrowLeft,
} from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Search",
      description:
        "Vector-based semantic search that understands context and natural language queries",
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: Globe,
      title: "MCP Integration",
      description:
        "Seamless integration with Model Context Protocol for AI applications and assistants",
      color: "bg-green-50 text-green-600",
    },
    {
      icon: ShieldCheck,
      title: "Enterprise Security",
      description: "Bank-grade encryption and security for your documentation and knowledge base",
      color: "bg-orange-50 text-orange-600",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized search and retrieval powered by advanced indexing and caching",
      color: "bg-yellow-50 text-yellow-600",
    },
  ];

  const stats = [
    { number: "10K+", label: "Documents" },
    { number: "500+", label: "Users" },
    { number: "99.9%", label: "Uptime" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left side - Branding and features */}
        <div className="hidden lg:flex lg:flex-col lg:justify-between lg:px-8 lg:py-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

          <div className="relative z-10">
            {/* Logo and back link */}
            <div className="flex items-center justify-between mb-12">
              <Link to="/" className="flex items-center gap-3 group">
                <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-3 shadow-lg group-hover:shadow-xl transition-shadow">
                  <BookOpen className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    Documentation MCP
                  </h1>
                  <p className="text-sm text-muted-foreground">AI-Powered Knowledge Base</p>
                </div>
              </Link>

              <Link
                to="/"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Back to home</span>
              </Link>
            </div>

            {/* Main content */}
            <div className="space-y-8">
              <div>
                <Badge variant="secondary" className="mb-4 px-3 py-1">
                  <Rocket className="mr-2 h-3 w-3" />
                  Trusted by 500+ teams
                </Badge>

                <h2 className="text-3xl font-bold tracking-tight mb-4 leading-tight">
                  Manage your documentation with{" "}
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    AI-powered search
                  </span>
                </h2>

                <p className="text-lg text-muted-foreground leading-relaxed">
                  Upload PDFs, HTML, and text files to create searchable knowledge bases that
                  integrate seamlessly with AI applications through MCP.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                  <Card key={index} className="border-0 bg-background/60 backdrop-blur">
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold">{stat.number}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Features */}
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg bg-background/40 backdrop-blur border border-border/50 hover:bg-background/60 transition-colors"
                  >
                    <div className={`rounded-xl p-2.5 ${feature.color}`}>
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional highlights */}
              <Card className="border-0 bg-primary/5 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Multi-Format Support</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Our intelligent parser handles PDFs, HTML, and text documents with advanced
                    extraction capabilities.
                  </p>
                  <Badge variant="outline" className="text-xs">
                    PDF • HTML • TXT • MD
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 text-sm text-muted-foreground">
            <p>
              © 2025 Documentation MCP. Built for the future of AI-powered knowledge management.
            </p>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="flex flex-col justify-center px-6 py-12 lg:px-8 bg-background/50 backdrop-blur">
          <div className="mx-auto w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden mb-8">
              <Link to="/" className="flex items-center gap-3 justify-center group">
                <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-3 shadow-lg group-hover:shadow-xl transition-shadow">
                  <BookOpen className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                    Documentation MCP
                  </h1>
                  <p className="text-xs text-muted-foreground">AI-Powered Knowledge Base</p>
                </div>
              </Link>
            </div>

            {/* Form header */}
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight mb-2">{title}</h2>
              <p className="text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>

            {/* Form wrapper with enhanced styling */}
            <Card className="border-0 bg-background/80 backdrop-blur shadow-xl">
              <CardContent className="p-8">{children}</CardContent>
            </Card>

            {/* Mobile features for small screens */}
            <div className="lg:hidden mt-8 space-y-4">
              <h3 className="text-sm font-semibold text-center mb-4">
                Why choose Documentation MCP?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {features.slice(0, 2).map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/60 backdrop-blur border border-border/50"
                  >
                    <div className={`rounded-lg p-2 ${feature.color}`}>
                      <feature.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
