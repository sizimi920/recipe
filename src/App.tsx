import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCategories, searchRecipes } from './api/rakuten';
import { RecipeCard } from './components/RecipeCard';
import { SearchForm } from './components/SearchForm';
import type {
  CategoryHierarchy,
  CategoryResponse,
  Recipe,
  RecipeSearchParams,
} from './types/rakuten';
import './App.css';

const creditHtml = `
<!-- Rakuten Web Services Attribution Snippet FROM HERE -->
<a href="https://webservice.rakuten.co.jp/" target="_blank"><img src="https://webservice.rakuten.co.jp/img/credit/200709/credit_31130.gif" border="0" alt="Rakuten Web Service Center" title="Rakuten Web Service Center" width="311" height="30"/></a>
<!-- Rakuten Web Services Attribution Snippet TO HERE -->
`;

function RakutenCredit() {
  return (
    <div
      aria-hidden // スクリーンリーダーにとってノイズなら付ける
      dangerouslySetInnerHTML={{ __html: creditHtml }}
    />
  );
}

function buildCategoryHierarchy(
  result: CategoryResponse['result']
): CategoryHierarchy {
  const mediumByLarge = (result.medium ?? []).reduce<
    CategoryHierarchy['mediumByLarge']
  >((acc, category) => {
    if (!acc[category.parentCategoryId]) {
      acc[category.parentCategoryId] = [];
    }
    acc[category.parentCategoryId].push(category);
    return acc;
  }, {});

  const smallByMedium = (result.small ?? []).reduce<
    CategoryHierarchy['smallByMedium']
  >((acc, category) => {
    if (!acc[category.parentCategoryId]) {
      acc[category.parentCategoryId] = [];
    }
    acc[category.parentCategoryId].push(category);
    return acc;
  }, {});

  return {
    large: result.large ?? [],
    mediumByLarge,
    smallByMedium,
  };
}

export default function App() {
  const [categories, setCategories] = useState<CategoryHierarchy | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | undefined>(undefined);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchAbortController = useRef<AbortController | null>(null);
  const largeCategoryIds = useMemo(
    () => (categories?.large ?? []).map((category) => category.categoryId),
    [categories],
  );

  const loadCategories = useCallback(() => {
    const controller = new AbortController();
    setCategoryLoading(true);
    setCategoryError(null);

    fetchCategories(controller.signal)
      .then((response) => {
        setCategories(buildCategoryHierarchy(response.result));
      })
      .catch((error: unknown) => {
        if ((error as Error)?.name === 'AbortError') {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : 'カテゴリの取得に失敗しました。';
        setCategoryError(message);
        setCategories(null);
      })
      .finally(() => {
        setCategoryLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const abortCleanup = loadCategories();
    return abortCleanup;
  }, [loadCategories]);

  const handleSearch = useCallback(async (params: RecipeSearchParams) => {
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }

    const controller = new AbortController();
    searchAbortController.current = controller;

    setSearching(true);
    setSearchError(null);

    try {
      const result = await searchRecipes(params, {
        signal: controller.signal,
        fallbackCategoryIds: largeCategoryIds,
      });
      setRecipes(result.recipes);
      setLastUpdate(result.lastUpdate);
      setHasSearched(true);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return;
      }
      const message =
        error instanceof Error ? error.message : 'レシピの取得に失敗しました。';
      setSearchError(message);
      setRecipes([]);
    } finally {
      if (searchAbortController.current === controller) {
        searchAbortController.current = null;
      }
      setSearching(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    searchAbortController.current?.abort();
    searchAbortController.current = null;
    setRecipes([]);
    setSearchError(null);
    setHasSearched(false);
    setLastUpdate(undefined);
  }, []);

  useEffect(() => {
    return () => {
      searchAbortController.current?.abort();
    };
  }, []);

  const resultMessage = useMemo(() => {
    if (searchError) {
      return searchError;
    }
    if (searching) {
      return 'レシピを検索しています...';
    }
    if (hasSearched && recipes.length === 0) {
      return '条件に一致するレシピが見つかりませんでした。キーワードやカテゴリを変更して再検索してください。';
    }
    return '';
  }, [hasSearched, recipes.length, searchError, searching]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <RakutenCredit />
          <h1>楽天レシピ検索</h1>
          <p>
            楽天レシピAPIを利用したキーワード＆カテゴリ検索アプリです。お好きな条件でレシピを探してみましょう。
          </p>
        </div>
      </header>

      <main className="app-main">
        <section className="search-panel">
          <h2>検索条件</h2>
          {categoryLoading && !categoryError ? (
            <div className="alert alert-info" role="status">
              カテゴリを読み込んでいます...
            </div>
          ) : null}
          {categoryError ? (
            <div className="alert alert-error" role="alert">
              <p>{categoryError}</p>
              <button
                type="button"
                onClick={loadCategories}
                disabled={categoryLoading}
              >
                {categoryLoading ? '再取得中...' : 'カテゴリを再取得'}
              </button>
            </div>
          ) : null}
          <SearchForm
            onSearch={handleSearch}
            onReset={handleReset}
            loading={searching}
            categories={categories}
          />
        </section>

        <section className="result-panel">
          <div className="result-header">
            <h2>検索結果</h2>
            {lastUpdate ? (
              <span className="last-update">最終更新: {lastUpdate}</span>
            ) : null}
          </div>

          {resultMessage ? (
            <p className="result-message">{resultMessage}</p>
          ) : null}

          <div className="recipe-grid">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.recipeId} recipe={recipe} />
            ))}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <small>
          データ提供:{' '}
          <a
            href="https://webservice.rakuten.co.jp/"
            target="_blank"
            rel="noopener noreferrer"
          >
            楽天ウェブサービス
          </a>
        </small>
      </footer>
    </div>
  );
}
