import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, TrendingUp, ShieldAlert, Info, HelpCircle } from "lucide-react";
import type { KnowledgeArticle } from "@/shared/schema";

const categoryConfig = {
  research: {
    label: "과학적 연구",
    icon: BookOpen,
    color: "bg-blue-500",
  },
  benefits: {
    label: "효과 및 이점",
    icon: TrendingUp,
    color: "bg-green-500",
  },
  safety_guide: {
    label: "안전 가이드",
    icon: ShieldAlert,
    color: "bg-red-500",
  },
  usage_guide: {
    label: "이용 방법",
    icon: Info,
    color: "bg-purple-500",
  },
  faq: {
    label: "자주 묻는 질문",
    icon: HelpCircle,
    color: "bg-orange-500",
  },
};

export default function KnowledgeCenter() {
  const { data: articles = [], isLoading } = useQuery<KnowledgeArticle[]>({
    queryKey: ["/api/knowledge/articles"],
  });

  const getArticlesByCategory = (category: string) => {
    return articles.filter((article) => article.category === category);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="knowledge-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">효소욕 인사이트 센터</h2>
        <p className="text-muted-foreground">과학적 근거와 효과적인 이용 방법을 알아보세요</p>
      </div>

      <Tabs defaultValue="benefits" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="text-xs" data-testid={`tab-${key}`}>
                <Icon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(categoryConfig).map(([category, config]) => {
          const categoryArticles = getArticlesByCategory(category);
          const Icon = config.icon;
          
          return (
            <TabsContent key={category} value={category} className="space-y-4">
              <ScrollArea className="h-[500px] pr-4">
                {categoryArticles.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">콘텐츠가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categoryArticles.map((article) => (
                      <Card key={article.id} className="hover:shadow-md transition-shadow" data-testid={`article-${article.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Badge className={`${config.color} text-white`}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {config.label}
                                </Badge>
                              </CardTitle>
                              <CardTitle className="text-xl mt-2">{article.title}</CardTitle>
                              {article.summary && (
                                <CardDescription className="mt-2">{article.summary}</CardDescription>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                            {article.content}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
