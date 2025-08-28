import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpenIcon,
  DatabaseIcon,
  ShieldCheckIcon,
  ZapIcon,
  ArrowRightIcon,
  UploadIcon,
  SearchIcon,
  GlobeIcon,
  CheckIcon,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const features = [
    {
      icon: UploadIcon,
      title: "Multi-Format Support",
      description:
        "Upload PDFs, HTML files, and plain text documents with ease. Our intelligent parser handles all formats seamlessly.",
    },
    {
      icon: SearchIcon,
      title: "AI-Powered Search",
      description:
        "Find information instantly with vector-based semantic search. Get accurate results even with natural language queries.",
    },
    {
      icon: GlobeIcon,
      title: "MCP Integration",
      description:
        "Seamlessly integrate with AI applications through Model Context Protocol. Perfect for AI agents and assistants.",
    },
    {
      icon: ShieldCheckIcon,
      title: "Secure & Private",
      description:
        "Your documents are stored securely with enterprise-grade encryption. Full control over your data.",
    },
    {
      icon: DatabaseIcon,
      title: "Organized Knowledge Base",
      description:
        "Create multiple document sets for different projects. Keep your knowledge organized and accessible.",
    },
    {
      icon: ZapIcon,
      title: "Lightning Fast",
      description:
        "Optimized for speed with advanced indexing and caching. Get results in milliseconds, not seconds.",
    },
  ];

  const useCases = [
    "Technical Documentation Management",
    "Research Paper Organization",
    "Legal Document Archives",
    "Product Manual Libraries",
    "Educational Resource Centers",
    "Corporate Knowledge Bases",
  ];

  const steps = [
    {
      step: "1",
      title: "Create Account",
      description:
        "Sign up for free and get instant access to your personal documentation workspace.",
    },
    {
      step: "2",
      title: "Upload Documents",
      description:
        "Upload your PDFs, HTML files, and text documents. Our system will parse and index them automatically.",
    },
    {
      step: "3",
      title: "Search & Integrate",
      description:
        "Search your documents with natural language or integrate with AI applications via MCP.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="relative border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary p-2">
                <BookOpenIcon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Documentation MCP</h1>
                <p className="text-xs text-muted-foreground">Knowledge Base Manager</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6">
              🚀 AI-Powered Documentation Platform
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl mb-6">
              Transform Your <span className="text-primary">Documents</span>
              <br />
              Into Smart Knowledge
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
              Upload, organize, and search your documentation with AI-powered semantic search.
              Perfect for developers, researchers, and teams building intelligent applications.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="h-12 px-8">
                  Start Building Free
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="h-12 px-8">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Everything You Need for Document Management
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for modern teams and AI applications. Powerful features that scale with your
              needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 bg-background/60 backdrop-blur">
                <CardContent className="p-6">
                  <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Get Started in Minutes</h2>
            <p className="text-lg text-muted-foreground">
              Simple setup, powerful results. Start building your knowledge base today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="rounded-full bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-6">Perfect for Every Use Case</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Whether you're managing technical docs, research papers, or building AI
                applications, Documentation MCP adapts to your workflow.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {useCases.map((useCase, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckIcon className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">{useCase}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="bg-background/60 backdrop-blur border-0">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-blue-100 p-3">
                      <GlobeIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">MCP Server Integration</h4>
                      <p className="text-sm text-muted-foreground">
                        Connect with Claude, ChatGPT, and other AI assistants
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-muted/50 rounded-lg p-4">
                    <code className="text-sm">
                      <div className="text-green-600"># Install MCP server</div>
                      <div>npm install -g documentation-mcp</div>
                      <div className="text-green-600 mt-2"># Configure in your AI app</div>
                      <div>{`"mcpServers": {`}</div>
                      <div className="ml-4">{`"docs": {`}</div>
                      <div className="ml-8">{`"command": "documentation-mcp"`}</div>
                      <div className="ml-4">{`}`}</div>
                      <div>{`}`}</div>
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Build Your Knowledge Base?</h2>
              <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                Join thousands of developers and teams using Documentation MCP to power their AI
                applications and organize their knowledge.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register">
                  <Button size="lg" variant="secondary" className="h-12 px-8">
                    Get Started Free
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="rounded-lg bg-primary p-2">
                <BookOpenIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold">Documentation MCP</p>
                <p className="text-xs text-muted-foreground">Knowledge Base Manager</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              © 2025 Documentation MCP. Built for the future of AI-powered knowledge management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
