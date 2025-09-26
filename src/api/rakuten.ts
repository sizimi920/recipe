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
}

function sanitizePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return fallback;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return undefined;
}

function detectCategoryType(categoryId: string): 'large' | 'medium' | 'small' | undefined {
  const segments = categoryId.split('-');
  if (segments.length === 1) {
    return 'large';
  }
  if (segments.length === 2) {
    return 'medium';
  }
  if (segments.length >= 3) {
    return 'small';
  }
  return undefined;
}

interface NormalizedRecipeSearch {
  recipes: Recipe[];
  lastUpdate?: string;
  hits?: number;
  page?: number;
  count?: number;
}

function normalizeRecipeList(result: RecipeSearchResponse): NormalizedRecipeSearch {
  const baseLastUpdate = result.lastUpdate;
  const payload = result.result;

  if (!payload) {
    return {
      recipes: [],
      lastUpdate: baseLastUpdate,
      hits: undefined,
      page: undefined,
      count: undefined,
    };
  }

  if (Array.isArray(payload)) {
    return {
      recipes: payload,
      lastUpdate: baseLastUpdate,
      hits: undefined,
      page: undefined,
      count: undefined,
    };
  }

  const searchPayload = payload as RecipeSearchPayload;
  const recipes = Array.isArray(searchPayload.recipes) ? searchPayload.recipes : [];
  const countValue = Number(searchPayload.count);
  return {
    recipes,
    lastUpdate: searchPayload.lastUpdate ?? baseLastUpdate,
    hits: optionalPositiveInteger(searchPayload.hits),
    page: optionalPositiveInteger(searchPayload.page),
    count: Number.isFinite(countValue) && countValue >= 0 ? Math.floor(countValue) : undefined,
  };
}

export async function searchRecipes(
  params: RecipeSearchParams,
  options?: RecipeSearchOptions,
): Promise<RecipeSearchResult> {
  const { signal } = options ?? {};
  const sanitizedHits = sanitizePositiveInteger(params.hits, 30);
  const sanitizedPage = sanitizePositiveInteger(params.page, 1);

  const searchParams = new URLSearchParams({
    format: 'json',
    applicationId: getApplicationId(),
    hits: String(sanitizedHits),
    page: String(sanitizedPage),
  });

  if (params.keyword?.trim()) {
    searchParams.set('keyword', params.keyword.trim());
  }

  if (params.categoryId) {
    searchParams.set('categoryId', params.categoryId);
    const categoryType = detectCategoryType(params.categoryId);
    if (categoryType) {
      searchParams.set('categoryType', categoryType);
    }
  }

  const url = `${BASE_URL}/Search/20170426?${searchParams.toString()}`;
  const data = await fetchJson<RecipeSearchResponse>(url, signal);
  const normalized = normalizeRecipeList(data);

  const hits = Number.isFinite(normalized.hits)
    ? Number(normalized.hits)
    : sanitizedHits;
  const page = Number.isFinite(normalized.page) ? Number(normalized.page) : sanitizedPage;

  return {
    recipes: normalized.recipes,
    lastUpdate: normalized.lastUpdate,
    hits,
    page,
    count: normalized.count,
  };
}
