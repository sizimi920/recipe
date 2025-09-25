import type { Recipe } from '../types/rakuten';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const imageUrl = recipe.mediumImageUrl || recipe.foodImageUrl || recipe.smallImageUrl;

  return (
    <article className="recipe-card">
      {imageUrl ? (
        <img className="recipe-image" src={imageUrl} alt={recipe.recipeTitle} loading="lazy" />
      ) : (
        <div className="recipe-image placeholder" aria-hidden="true">
          📷
        </div>
      )}
      <div className="recipe-content">
        <div className="recipe-rank">#{recipe.rank}</div>
        <h3 className="recipe-title">
          <a href={recipe.recipeUrl} target="_blank" rel="noopener noreferrer">
            {recipe.recipeTitle}
          </a>
        </h3>
        {recipe.recipeDescription && <p className="recipe-description">{recipe.recipeDescription}</p>}
        {recipe.recipeMaterial?.length ? (
          <div className="recipe-materials">
            <h4>材料</h4>
            <ul>
              {recipe.recipeMaterial.map((material) => (
                <li key={material}>{material}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <dl className="recipe-meta">
          {recipe.recipeIndication ? (
            <div>
              <dt>調理時間</dt>
              <dd>{recipe.recipeIndication}</dd>
            </div>
          ) : null}
          {recipe.recipeCost ? (
            <div>
              <dt>費用目安</dt>
              <dd>{recipe.recipeCost}</dd>
            </div>
          ) : null}
          {recipe.recipePublishday ? (
            <div>
              <dt>公開日</dt>
              <dd>{recipe.recipePublishday}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </article>
  );
}
