import type {
  CategoryRankingResponse,
  CategoryResponse,
  Recipe,
  RecipeSearchParams,
  RecipeSearchResult,
} from '../types/rakuten';

const BASE_URL = 'https://app.rakuten.co.jp/services/api/Recipe';

function getApplicationId(): string {
  const appId = import.meta.env.VITE_RAKUTEN_APP_ID;
  if (!appId) {
    throw new Error(
      'RakutenアプリIDが設定されていません。プロジェクトルートに.envファイルを作成し、VITE_RAKUTEN_APP_IDを指定してください。',
    );
  }
  return appId;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    let message = `リクエストに失敗しました (status: ${response.status})`;
    try {
      const data = await response.json();
      if (data?.error_description) {
        message = data.error_description;
      } else if (data?.error) {
        message = data.error;
      }
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    throw new Error(message);
  }

  const data: T = await response.json();
  const maybeError = data as { error?: string; error_description?: string };
  if (maybeError?.error) {
    throw new Error(maybeError.error_description ?? maybeError.error);
  }
  return data;
}

export async function fetchCategories(signal?: AbortSignal) {
  const params = new URLSearchParams({
    format: 'json',
    applicationId: getApplicationId(),
  });

  const url = `${BASE_URL}/CategoryList/20170426?${params.toString()}`;
  return fetchJson<CategoryResponse>(url, signal);
}

interface RecipeSearchOptions {
  signal?: AbortSignal;
  fallbackCategoryIds?: string[];
}

const MAX_FALLBACK_CATEGORY_FETCH = 12;

function sanitizePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return fallback;
}

function normaliseKeyword(keyword: string | undefined): string[] {
  if (!keyword) {
    return [];
  }

  return keyword
    .trim()
    .replace(/[\s\u3000]+/g, ' ')
    .split(' ')
    .map((term) => term.toLowerCase())
    .filter(Boolean);
}

function recipeMatchesKeyword(recipe: Recipe, terms: string[]): boolean {
  if (!terms.length) {
    return true;
  }

  const haystack = [
    recipe.recipeTitle,
    recipe.recipeDescription,
    ...(recipe.recipeMaterial ?? []),
  ]
    .join(' ')
    .toLowerCase();

  return terms.every((term) => haystack.includes(term));
}

async function fetchCategoryRanking(
  categoryId: string,
  hits: number,
  signal?: AbortSignal,
): Promise<CategoryRankingResponse> {
  const params = new URLSearchParams({
    format: 'json',
    applicationId: getApplicationId(),
    categoryId,
    hits: String(hits),
  });

  const url = `${BASE_URL}/CategoryRanking/20170426?${params.toString()}`;
  return fetchJson<CategoryRankingResponse>(url, signal);
}

function deduplicateRecipes(recipes: Recipe[]): Recipe[] {
  const seen = new Set<number>();
  const unique: Recipe[] = [];

  for (const recipe of recipes) {
    if (seen.has(recipe.recipeId)) {
      continue;
    }
    seen.add(recipe.recipeId);
    unique.push(recipe);
  }

  return unique;
}

function applySequentialRank(recipes: Recipe[]): Recipe[] {
  return recipes.map((recipe, index) => ({
    ...recipe,
    rank: recipe.rank ?? String(index + 1),
  }));
}

export async function searchRecipes(
  params: RecipeSearchParams,
  options?: RecipeSearchOptions,
): Promise<RecipeSearchResult> {
  const { signal, fallbackCategoryIds } = options ?? {};
  const hits = sanitizePositiveInteger(params.hits, 30);
  const keywords = normaliseKeyword(params.keyword);
  const hasKeyword = keywords.length > 0;
  const categoryId = params.categoryId;

  const categoryIdsToFetch: string[] = [];

  if (categoryId) {
    categoryIdsToFetch.push(categoryId);
  } else if (fallbackCategoryIds?.length) {
    categoryIdsToFetch.push(
      ...fallbackCategoryIds.slice(0, MAX_FALLBACK_CATEGORY_FETCH),
    );
  }

  if (!categoryIdsToFetch.length) {
    throw new Error('検索に使用するカテゴリが見つかりませんでした。ページを再読み込みしてください。');
  }

  const rankingResults = await Promise.all(
    categoryIdsToFetch.map((id) => fetchCategoryRanking(id, hits, signal)),
  );

  const combinedRecipes = rankingResults.flatMap((result) => result.result ?? []);
  const filteredRecipes = deduplicateRecipes(
    hasKeyword ? combinedRecipes.filter((recipe) => recipeMatchesKeyword(recipe, keywords)) : combinedRecipes,
  );

  const limitedRecipes = applySequentialRank(filteredRecipes).slice(0, hits);

  const lastUpdate = rankingResults.find((result) => result.lastUpdate)?.lastUpdate;

  return {
    recipes: limitedRecipes,
    lastUpdate,
    hits,
    page: 1,
    count: filteredRecipes.length,
  };
}
