import type {
  CategoryResponse,
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

export async function searchRecipes(
  params: RecipeSearchParams,
  signal?: AbortSignal,
): Promise<RecipeSearchResult> {
  const searchParams = new URLSearchParams({
    format: 'json',
    applicationId: getApplicationId(),
    hits: String(params.hits ?? 30),
    page: String(params.page ?? 1),
  });

  if (params.keyword) {
    searchParams.set('keyword', params.keyword.trim());
  }
  if (params.categoryId) {
    searchParams.set('categoryId', params.categoryId);
  }

  const url = `${BASE_URL}/CategoryRanking/20170426?${searchParams.toString()}`;
  const data = await fetchJson<RecipeSearchResponse>(url, signal);

  return {
    recipes: data.result ?? [],
    lastUpdate: data.lastUpdate,
    hits: Number(params.hits ?? 30),
    page: Number(params.page ?? 1),
  };
}
