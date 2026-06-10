import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SwaggerDocs: React.FC = () => {
  const navigate = useNavigate();
  const swaggerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 动态加载 Swagger UI 资源
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js';
    script.async = true;
    script.onload = () => {
      if (window.SwaggerUIBundle) {
        window.SwaggerUIBundle({
          dom_id: '#swagger-ui',
          spec: swaggerSpec,
          presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIBundle.SwaggerUIStandalonePreset
          ],
          layout: "BaseLayout",
          deepLinking: true,
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  const swaggerSpec = {
    openapi: "3.0.0",
    info: {
      title: "Admin API Documentation",
      description: "Comprehensive documentation for the Admin API Gateway and related services.",
      version: "1.0.0"
    },
    servers: [
      {
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api-gateway`,
        description: "Admin API Gateway"
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        },
        OAuth2: {
          type: "oauth2",
          flows: {
            clientCredentials: {
              tokenUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-oauth-server/token`,
              scopes: {
                "admin:read": "Read admin data",
                "admin:write": "Write admin data"
              }
            }
          }
        }
      }
    },
    security: [
      { BearerAuth: [] },
      { OAuth2: ["admin:read", "admin:write"] }
    ],
    paths: {
      "/health": {
        get: {
          summary: "Service Health Check",
          responses: {
            "200": {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string" },
                      version: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/users": {
        get: {
          summary: "List all users",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 100 } }
          ],
          responses: {
            "200": { description: "User list" }
          }
        },
        put: {
          summary: "Update user profile",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    role: { type: "string" },
                    custom_fields: { type: "object" }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Updated user" }
          }
        }
      },
      "/logs": {
        get: {
          summary: "Get operation logs",
          responses: {
            "200": { description: "Log list" }
          }
        }
      },
      "/configs": {
        get: {
          summary: "Get system configurations",
          responses: {
            "200": { description: "Configuration list" }
          }
        },
        post: {
          summary: "Update system configuration",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    value: { type: "string" },
                    description: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Success" }
          }
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        <header className="flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-black tracking-tight">API 文档中心</h1>
          </div>
          <Button variant="outline" className="rounded-xl gap-2" onClick={() => window.open(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api-gateway/health`, '_blank')}>
            <ExternalLink className="w-4 h-4" />
            查看健康状态
          </Button>
        </header>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2rem] overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full" />
              Swagger UI - 可交互文档
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div id="swagger-ui" className="min-h-[600px]" />
          </CardContent>
        </Card>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui { background: white; padding: 20px; border-radius: 1rem; }
        .swagger-ui .scheme-container { background: transparent; box-shadow: none; border-bottom: 1px solid #eee; }
      `}} />
    </div>
  );
};

declare global {
  interface Window {
    SwaggerUIBundle: any;
  }
}

export default SwaggerDocs;
