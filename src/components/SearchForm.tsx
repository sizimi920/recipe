import { FormEvent, useMemo, useState } from 'react';
import type { CategoryHierarchy, RecipeSearchParams } from '../types/rakuten';

interface SearchFormProps {
  onSearch: (params: RecipeSearchParams) => void;
  onReset?: () => void;
  loading: boolean;
  categories?: CategoryHierarchy | null;
}

const HIT_OPTIONS = [10, 20, 30];

export function SearchForm({ onSearch, onReset, loading, categories }: SearchFormProps) {
  const [keyword, setKeyword] = useState('');
  const [selectedLarge, setSelectedLarge] = useState('');
  const [selectedMedium, setSelectedMedium] = useState('');
  const [selectedSmall, setSelectedSmall] = useState('');
  const [hits, setHits] = useState<number>(30);

  const mediumOptions = useMemo(() => {
    if (!categories || !selectedLarge) {
      return [];
    }
    return categories.mediumByLarge[selectedLarge] ?? [];
  }, [categories, selectedLarge]);

  const smallOptions = useMemo(() => {
    if (!categories || !selectedMedium) {
      return [];
    }
    return categories.smallByMedium[selectedMedium] ?? [];
  }, [categories, selectedMedium]);

  const composeCategoryId = (
    parentId: string | undefined,
    id: string | undefined
  ): string | undefined => {
    if (!id) {
      return undefined;
    }
    if (id.includes('-')) {
      return id;
    }
    if (!parentId) {
      return id;
    }
    return parentId + '-' + id;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedKeyword = keyword.trim();

    const mediumCategory = mediumOptions.find((category) => category.categoryId === selectedMedium);
    const smallCategory = smallOptions.find((category) => category.categoryId === selectedSmall);

    const mediumCategoryId = mediumCategory
      ? composeCategoryId(selectedLarge || mediumCategory.parentCategoryId, mediumCategory.categoryId)
      : composeCategoryId(selectedLarge || undefined, selectedMedium || undefined);

    const smallCategoryId = smallCategory
      ? composeCategoryId(mediumCategoryId ?? smallCategory.parentCategoryId, smallCategory.categoryId)
      : undefined;

    const categoryId = smallCategoryId ?? mediumCategoryId ?? (selectedLarge || undefined);

    onSearch({
      keyword: trimmedKeyword ? trimmedKeyword : undefined,
      categoryId,
      hits,
    });
  };

  const handleReset = () => {
    setKeyword('');
    setSelectedLarge('');
    setSelectedMedium('');
    setSelectedSmall('');
    setHits(30);
    onReset?.();
  };

  const categoriesReady = Boolean(categories?.large.length);

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label className="form-field" htmlFor="keyword">
          <span className="form-label">キーワード</span>
          <input
            id="keyword"
            name="keyword"
            type="text"
            placeholder="食材や料理名で検索"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
        <label className="form-field" htmlFor="hits">
          <span className="form-label">表示件数</span>
          <select
            id="hits"
            name="hits"
            value={hits}
            onChange={(event) => setHits(Number(event.target.value))}
          >
            {HIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}件
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="form-fieldset">
        <legend>カテゴリで絞り込み</legend>
        <div className="form-row">
          <label className="form-field" htmlFor="largeCategory">
            <span className="form-label">大分類</span>
            <select
              id="largeCategory"
              value={selectedLarge}
              disabled={!categoriesReady || loading}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedLarge(value);
                setSelectedMedium('');
                setSelectedSmall('');
              }}
            >
              <option value="">すべて</option>
              {categories?.large.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.categoryName}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field" htmlFor="mediumCategory">
            <span className="form-label">中分類</span>
            <select
              id="mediumCategory"
              value={selectedMedium}
              disabled={!mediumOptions.length || loading}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedMedium(value);
                setSelectedSmall('');
              }}
            >
              <option value="">すべて</option>
              {mediumOptions.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.categoryName}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field" htmlFor="smallCategory">
            <span className="form-label">小分類</span>
            <select
              id="smallCategory"
              value={selectedSmall}
              disabled={!smallOptions.length || loading}
              onChange={(event) => setSelectedSmall(event.target.value)}
            >
              <option value="">すべて</option>
              {smallOptions.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.categoryName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="primary" disabled={loading}>
          {loading ? '検索中...' : 'レシピを検索'}
        </button>
        <button type="button" className="secondary" onClick={handleReset} disabled={loading}>
          リセット
        </button>
      </div>
    </form>
  );
}
