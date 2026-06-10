import { type ReactNode } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { KeywordReplacementProvider } from "@/contexts/KeywordReplacementContext";
import { MusicProvider } from "@/contexts/MusicContext";

const PageMeta = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
  </Helmet>
);

export const AppWrapper = ({ children }: { children: ReactNode }) => (
  <HelmetProvider>
    <ConfigProvider>
      <KeywordReplacementProvider>
        <MusicProvider>
          {children}
        </MusicProvider>
      </KeywordReplacementProvider>
    </ConfigProvider>
  </HelmetProvider>
);

export default PageMeta;
