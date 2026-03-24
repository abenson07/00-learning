export type HomeArticle = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  domain: string;
  /** Set when `article_content` is null in the database */
  comingSoon: boolean;
};
