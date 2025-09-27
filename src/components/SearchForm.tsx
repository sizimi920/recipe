import { FormEvent, useMemo, useState } from 'react';
import type { CategoryHierarchy, RecipeSearchParams } from '../types/rakuten';

interface SearchFormProps {
  onSearch: (params: RecipeSearchParams) => void;
  onReset?: () => void;
  loading: boolean;
  categories?: CategoryHierarchy | null;
}

export function SearchForm({ onSearch, onReset, loading, categories }: SearchFormProps) {
  const [keyword, setKeyword] = useState('');
  const [selectedLarge, setSelectedLarge] = useState('');
  const [selectedMedium, setSelectedMedium] = useState('');
  const [selectedSmall, setSelectedSmall] = useState('');

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

  const selectedCategoryId = useMemo(() => {
    const mediumCategory = mediumOptions.find((category) => category.categoryId === selectedMedium);
    const smallCategory = smallOptions.find((category) => category.categoryId === selectedSmall);

    const mediumCategoryId = mediumCategory
      ? composeCategoryId(selectedLarge || mediumCategory.parentCategoryId, mediumCategory.categoryId)
      : composeCategoryId(selectedLarge || undefined, selectedMedium || undefined);

    const smallCategoryId = smallCategory
      ? composeCategoryId(mediumCategoryId ?? smallCategory.parentCategoryId, smallCategory.categoryId)
      : undefined;

    return smallCategoryId ?? mediumCategoryId ?? (selectedLarge || undefined);
  }, [mediumOptions, selectedLarge, selectedMedium, selectedSmall, smallOptions]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedKeyword = keyword.trim();

    if (!selectedCategoryId) {
      return;
    }

    onSearch({
      keyword: trimmedKeyword ? trimmedKeyword : undefined,
      categoryId: selectedCategoryId,
      hits: 4,
    });
  };

  const handleReset = () => {
    setKeyword('');
    setSelectedLarge('');
    setSelectedMedium('');
    setSelectedSmall('');
    onReset?.();
  };

  const categoriesReady = Boolean(categories?.large.length);
  const keywordDisabled = !selectedCategoryId;

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label className="form-field" htmlFor="keyword">
          <span className="form-label">キーワード</span>
          <input
            id="keyword"
            name="keyword"
            type="text"
            placeholder="カテゴリ選択後に入力できます"
            value={keyword}
            disabled={keywordDisabled || loading}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <p className="form-helper">
            {keywordDisabled
              ? 'カテゴリで絞り込んでからキーワードを入力できます'
              : 'カテゴリ内をキーワードでさらに絞り込めます'}
          </p>
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
        <button
          type="submit"
          className="primary"
          disabled={loading || !selectedCategoryId}
        >
          {loading ? '検索中...' : 'レシピを検索'}
        </button>
        <button type="button" className="secondary" onClick={handleReset} disabled={loading}>
          リセット
        </button>
      </div>
    </form>
  );
}
