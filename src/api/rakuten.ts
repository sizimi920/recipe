import type {
  CategoryResponse,
  RecipeSearchMeta,
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

function isSearchMeta(result: RecipeSearchResponse['result']): result is RecipeSearchMeta {
  return !Array.isArray(result) && typeof result === 'object' && result !== null;
}

export async function searchRecipes(
  params: RecipeSearchParams,
  signal?: AbortSignal,
): Promise<RecipeSearchResult> {
  const requestedHits = Number(params.hits ?? 30);
  const requestedPage = Number(params.page ?? 1);

  const searchParams = new URLSearchParams({
    format: 'json',
    applicationId: getApplicationId(),
    hits: String(requestedHits),
    page: String(requestedPage),
  });

  const trimmedKeyword = params.keyword?.trim();
  if (trimmedKeyword) {
    searchParams.set('keyword', trimmedKeyword);
  }

  if (params.categoryId) {
    searchParams.set('categoryId', params.categoryId);
  }

  const url = `${BASE_URL}/Search/20170426?${searchParams.toString()}`;
  const data = await fetchJson<RecipeSearchResponse>(url, signal);

  const result = data.result;
  const recipes = Array.isArray(result)
    ? result
    : Array.isArray(result?.recipe)
    ? result.recipe
    : [];

  const page = isSearchMeta(result) && typeof result.page === 'number' ? result.page : requestedPage;
  const hits = isSearchMeta(result) && typeof result.hits === 'number' ? result.hits : requestedHits;

  const recipesWithRank = recipes.map((recipe, index) => ({
    ...recipe,
    rank: recipe.rank ?? String((page - 1) * hits + index + 1),
  }));

  return {
    recipes: recipesWithRank,
    lastUpdate: data.lastUpdate,
    hits,
    page,
  };
}
