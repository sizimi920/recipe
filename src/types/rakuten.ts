export interface LargeCategory {
  categoryId: string;
  categoryName: string;
}

export interface MediumCategory extends LargeCategory {
  parentCategoryId: string;
}

export interface SmallCategory extends LargeCategory {
  parentCategoryId: string;
}

export interface CategoryResponse {
  result: {
    large: LargeCategory[];
    medium: MediumCategory[];
    small: SmallCategory[];
  };
}

export interface Recipe {
  recipeId: number;
  recipeTitle: string;
  recipeUrl: string;
  rank?: string;
  foodImageUrl: string;
  mediumImageUrl: string;
  smallImageUrl: string;
  recipeDescription: string;
  recipeMaterial: string[];
  recipePublishday?: string;
  recipeIndication?: string;
  recipeCost?: string;
}

export interface RecipeSearchParams {
  keyword?: string;
  categoryId?: string;
  page?: number;
  hits?: number;
}

export interface RecipeSearchMeta {
  count: number;
  page: number;
  hits: number;
  last: number;
  recipe: Recipe[];
}

export interface RecipeSearchResponse {
  result: Recipe[] | RecipeSearchMeta;
  lastUpdate?: string;
}

export interface RecipeSearchResult {
  recipes: Recipe[];
  lastUpdate?: string;
  page: number;
  hits: number;
}

export interface CategoryHierarchy {
  large: LargeCategory[];
  mediumByLarge: Record<string, MediumCategory[]>;
  smallByMedium: Record<string, SmallCategory[]>;
}
