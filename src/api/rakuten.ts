import type {
  CategoryResponse,
  Recipe,
  RecipeSearchParams,
  RecipeSearchResponse,
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

function normalizeKeywordTerms(keyword?: string): string[] {
  if (!keyword) {
    return [];
  }
  return keyword
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.toLocaleLowerCase());
}

function matchesAllTerms(recipe: Recipe, terms: string[]): boolean {
  if (terms.length === 0) {
    return true;
  }

  const searchableTexts: string[] = [];

  if (recipe.recipeTitle) {
    searchableTexts.push(recipe.recipeTitle);
  }
  if (recipe.recipeDescription) {
    searchableTexts.push(recipe.recipeDescription);
  }
  if (Array.isArray(recipe.recipeMaterial) && recipe.recipeMaterial.length > 0) {
    searchableTexts.push(recipe.recipeMaterial.join(' '));
  }

  if (searchableTexts.length === 0) {
    return false;
  }

  const lowerCased = searchableTexts.map((text) => text.toLocaleLowerCase());
  return terms.every((term) => lowerCased.some((text) => text.includes(term)));
}

async function fetchRankingForCategory(
  categoryId: string,
  signal?: AbortSignal,
): Promise<RecipeSearchResponse> {
  const searchParams = new URLSearchParams({
    format: 'json',
    applicationId: getApplicationId(),
    categoryId,
  });

  const url = `${BASE_URL}/CategoryRanking/20170426?${searchParams.toString()}`;
  return fetchJson<RecipeSearchResponse>(url, signal);
}

export async function searchRecipes(
  params: RecipeSearchParams,
  options?: RecipeSearchOptions,
): Promise<RecipeSearchResult> {
  const { signal, fallbackCategoryIds } = options ?? {};
  const requestedHits = Number.isFinite(params.hits) ? Number(params.hits) : 30;
  const sanitizedHits = requestedHits > 0 ? requestedHits : 30;

  const categoryIds: string[] = [];
  if (params.categoryId) {
    categoryIds.push(params.categoryId);
  } else if (fallbackCategoryIds?.length) {
    for (const id of fallbackCategoryIds) {
      if (id && !categoryIds.includes(id)) {
        categoryIds.push(id);
      }
      if (categoryIds.length >= 10) {
        break;
      }
    }
  }

  if (categoryIds.length === 0) {
    categoryIds.push('10');
  }

  const keywordTerms = normalizeKeywordTerms(params.keyword);
  const recipesById = new Map<number, Recipe>();
  let newestUpdate: string | undefined;
  let encounteredError: unknown = null;
  let successfulFetch = false;

  for (const categoryId of categoryIds) {
    try {
      const data = await fetchRankingForCategory(categoryId, signal);
      successfulFetch = true;

      if (data.lastUpdate) {
        if (!newestUpdate || data.lastUpdate > newestUpdate) {
          newestUpdate = data.lastUpdate;
        }
      }

      const recipes = Array.isArray(data.result) ? data.result : [];
      for (const recipe of recipes) {
        if (!recipesById.has(recipe.recipeId)) {
          recipesById.set(recipe.recipeId, recipe);
        }
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        throw error;
      }
      encounteredError = error;
    }
  }

  if (!successfulFetch) {
    if (encounteredError instanceof Error) {
      throw encounteredError;
    }
    throw new Error('レシピの取得に失敗しました。');
  }

  const aggregatedRecipes = Array.from(recipesById.values());
  const filteredRecipes = keywordTerms.length
    ? aggregatedRecipes.filter((recipe) => matchesAllTerms(recipe, keywordTerms))
    : aggregatedRecipes;

  const limitedRecipes = filteredRecipes.slice(0, sanitizedHits).map((recipe, index) => ({
    ...recipe,
    rank: String(index + 1),
  }));

  return {
    recipes: limitedRecipes,
    lastUpdate: newestUpdate,
    hits: sanitizedHits,
    page: 1,
  };
}
