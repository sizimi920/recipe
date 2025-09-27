import type { Recipe } from '../types/rakuten';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const imageUrl =
    recipe.mediumImageUrl || recipe.foodImageUrl || recipe.smallImageUrl;

  const getCostEmoji = (cost?: string) => {
    if (!cost) return '💵';
    if (cost.includes('安い')) return '💲';
    if (cost.includes('高い')) return '💰';
    return '💵';
  };

  const getTimeEmoji = (time?: string) => {
    if (!time) return '⏳';
    if (time.includes('短い') || time.includes('５分')) return '🏃';
    if (time.includes('長い') || time.includes('一晩')) return '🕰️';
    return '⏰';
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: recipe.recipeTitle,
          text: recipe.recipeDescription,
          url: recipe.recipeUrl,
        })
        .catch(() => {
          // シェア失敗時は通常のリンクで対応
        });
    }
  };

  return (
    <article className="recipe-card">
      <div className="recipe-header">
        {imageUrl ? (
          <div className="recipe-image">
            <img
              className="recipe-img"
              src={imageUrl}
              alt={recipe.recipeTitle}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('placeholder');
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.textContent = '📷';
                }
              }}
            />
            {recipe.rank ? (
              <div className="recipe-rank">🎖 #{recipe.rank}</div>
            ) : null}
          </div>
        ) : (
          <div className="recipe-image placeholder" aria-hidden="true">
            📷
          </div>
        )}
      </div>

      <div className="recipe-content">
        <div className="recipe-header">
          <h3 className="recipe-title">
            <a
              href={recipe.recipeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {recipe.recipeTitle}
            </a>
          </h3>
          <div className="recipe-actions">
            <button
              type="button"
              className="action-button"
              onClick={handleShare}
              title="このレシピをシェア"
              aria-label="シェア"
            >
              💌
            </button>
          </div>
        </div>

        {recipe.recipeDescription && (
          <p className="recipe-description">{recipe.recipeDescription}</p>
        )}

        <div className="recipe-quick-info">
          {recipe.recipeIndication && (
            <span className="quick-info-item" title="調理時間">
              {getTimeEmoji(recipe.recipeIndication)} {recipe.recipeIndication}
            </span>
          )}
          {recipe.recipeCost && (
            <span className="quick-info-item" title="費用目安">
              {getCostEmoji(recipe.recipeCost)} {recipe.recipeCost}
            </span>
          )}
          {recipe.recipePublishday && (
            <span className="quick-info-item" title="公開日">
              📅 {recipe.recipePublishday}
            </span>
          )}
        </div>

        {recipe.recipeMaterial?.length ? (
          <div className="recipe-materials">
            <h4>📌 必要な材料</h4>
            <ul className="material-list">
              {recipe.recipeMaterial.slice(0, 3).map((material) => (
                <li key={material}>🔹 {material}</li>
              ))}
              {recipe.recipeMaterial.length > 3 && (
                <li
                  className="more"
                  title={`残り${
                    recipe.recipeMaterial.length - 3
                  }件の材料を見る`}
                  aria-label={`残り${
                    recipe.recipeMaterial.length - 3
                  }件の材料を表示`}
                >
                  +{recipe.recipeMaterial.length - 3} 件
                </li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}
