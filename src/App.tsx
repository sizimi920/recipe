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
      className="rakuten-credit"
      dangerouslySetInnerHTML={{ __html: creditHtml }}
    />
  );
}
function buildCategoryHierarchy(
  result: CategoryResponse['result']
): CategoryHierarchy {
  const largeCategories = (result.large ?? []).map((category) => ({
    ...category,
    categoryId: String(category.categoryId),
  }));

  const mediumCategories = (result.medium ?? []).map((category) => ({
    ...category,
    categoryId: String(category.categoryId),
    parentCategoryId: String(category.parentCategoryId),
  }));

  const smallCategories = (result.small ?? []).map((category) => ({
    ...category,
    categoryId: String(category.categoryId),
    parentCategoryId: String(category.parentCategoryId),
  }));

  const mediumByLarge = mediumCategories.reduce<
    CategoryHierarchy['mediumByLarge']
  >((acc, category) => {
    if (!acc[category.parentCategoryId]) {
      acc[category.parentCategoryId] = [];
    }
    acc[category.parentCategoryId].push(category);
    return acc;
  }, {});

  const smallByMedium = smallCategories.reduce<
    CategoryHierarchy['smallByMedium']
  >((acc, category) => {
    if (!acc[category.parentCategoryId]) {
      acc[category.parentCategoryId] = [];
    }
    acc[category.parentCategoryId].push(category);
    return acc;
  }, {});

  return {
    large: largeCategories,
    mediumByLarge,
    smallByMedium,
  };
}

export default function App() {
  // ---------------- Theme (Light / Dark) ----------------
  const THEME_KEY = 'app-theme';
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
    return stored ?? (prefersDark ? 'dark' : 'light');
  });

  // Apply to :root attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Listen system preference changes
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      // Only auto-update if user hasn't manually toggled (i.e., storage not set explicitly)
      const stored = localStorage.getItem(THEME_KEY);
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  const [categories, setCategories] = useState<CategoryHierarchy | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | undefined>(undefined);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ---------------- SEO & Dynamic Title ----------------
  useEffect(() => {
    const baseTitle = '楽天レシピ検索 - カテゴリ・キーワードで簡単レシピ検索';
    if (recipes.length > 0) {
      document.title = `${recipes.length}件のレシピを表示中 | ${baseTitle}`;
    } else if (hasSearched && !searching) {
      document.title = `レシピが見つかりませんでした | ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [recipes.length, hasSearched, searching]);

  const searchAbortController = useRef<AbortController | null>(null);

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
      const result = await searchRecipes(params, controller.signal);
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

  const topRecipes = useMemo(() => recipes.slice(0, 4), [recipes]);

  const resultMessage = useMemo(() => {
    if (searchError) {
      return searchError;
    }
    if (searching) {
      return (
        <>
          <span className="loading-spinner" aria-hidden="true"></span>
          レシピを検索しています...
        </>
      );
    }
    if (hasSearched && recipes.length === 0) {
      return null; // Empty state will be shown separately
    }
    return '';
  }, [hasSearched, recipes.length, searchError, searching]);

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        メインコンテンツにスキップ
      </a>
      <header className="app-header">
        <button
          type="button"
          className="theme-toggle"
          aria-label={
            theme === 'light'
              ? 'ダークモードに切り替え'
              : 'ライトモードに切り替え'
          }
          title={
            theme === 'light'
              ? 'ダークモードに切り替え'
              : 'ライトモードに切り替え'
          }
          onClick={toggleTheme}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <div className="header-content">
          <RakutenCredit />
          <h1>楽天レシピ検索</h1>
          <p>
            楽天レシピAPIを利用したキーワード＆カテゴリ検索アプリです。お好きな条件でレシピを探してみましょう。
          </p>
        </div>
      </header>

      <main id="main-content" className="app-main">
        <section className="search-panel">
          <h2>検索条件</h2>
          {categoryLoading && !categoryError ? (
            <div className="alert alert-info" role="status">
              <span className="loading-spinner" aria-hidden="true"></span>
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

          <div aria-live="polite" aria-atomic="true">
            {resultMessage ? (
              <p className="result-message">{resultMessage}</p>
            ) : topRecipes.length > 0 ? (
              <p className="result-note">
                選択したカテゴリのランキング上位4件を表示しています。
              </p>
            ) : null}
          </div>

          <div className="recipe-grid">
            {topRecipes.length > 0 ? (
              topRecipes.map((recipe) => (
                <RecipeCard key={recipe.recipeId} recipe={recipe} />
              ))
            ) : hasSearched && !searching && !searchError ? (
              <div className="empty-state">
                <span className="empty-state-icon" aria-hidden="true">
                  🍽️
                </span>
                <h3>レシピが見つかりませんでした</h3>
                <p>キーワードやカテゴリを変更して再検索してみてください</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <small>
          🏪 データ提供:{' '}
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
